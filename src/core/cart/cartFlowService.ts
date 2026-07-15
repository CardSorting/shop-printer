import { ProductNotFoundError, InsufficientStockError } from '@domain/errors';
import type { Cart } from '@domain/models';
import type { ICartRepository } from '@domain/repositories';
import { addCartItem, calculateCartTotal, cartLineMatches, removeCartItem, updateCartItemQuantity } from '@domain/rules';
import { getUnifiedDb, runTransaction } from '@infrastructure/firebase/bridge';
import type { CartApplicationService } from './cartApplicationService';
import type { CartUxEventBus } from './cartEvents';
import { cartErr, cartOk, type CartResult } from './cartResult';
import type { CartValidationService } from './cartValidationService';
import {
  buildEmptyCartView,
  enrichCartLineItems,
  isCartExpired,
  mapCartToView,
} from './cartViewMapper';
import type { InventoryAvailabilityReader } from './inventoryAvailabilityReader';
import type { PricingSnapshotService } from './pricingSnapshotService';
import type { ProductReadModel } from './productReadModel';
import type {
  AddCartItemInput,
  ApplyDiscountInput,
  CartValidation,
  CartView,
  ClearCartInput,
  GetCartInput,
  PreviewLineItemInput,
  RemoveCartItemInput,
  UpdateCartItemInput,
  UpdateCartNoteInput,
  ValidateCartInput,
  CartLineItem,
} from './types';
import type { DiscountService } from '../DiscountService';
import { mergeGuestCartItems } from './mergeGuestCart';
import type { CartIssue } from './types';

type CartFlowDeps = {
  cartRepo: ICartRepository;
  productReadModel: ProductReadModel;
  availabilityReader: InventoryAvailabilityReader;
  pricingSnapshot: PricingSnapshotService;
  validation: CartValidationService;
  discountService?: Pick<DiscountService, 'validateDiscount'>;
  events?: CartUxEventBus;
};

export class CartFlowService implements CartApplicationService {
  constructor(private deps: CartFlowDeps) {}

  async getCart(input: GetCartInput): Promise<CartResult<CartView>> {
    try {
      const cart = await this.getPersistedCart(input.userId);
      if (!cart || cart.items.length === 0) {
        return cartOk(buildEmptyCartView(input.userId));
      }
      if (isCartExpired(cart)) {
        this.deps.events?.emit({ type: 'cart.expired', userId: input.userId });
      }
      const items = await enrichCartLineItems(
        cart,
        this.deps.productReadModel,
        this.deps.availabilityReader,
      );
      return cartOk(mapCartToView(cart, items));
    } catch (err) {
      return this.mapError(err);
    }
  }

  async addItem(input: AddCartItemInput): Promise<CartResult<CartView>> {
    try {
      const cart = await this.addPersistedItem(
        input.userId,
        input.productId,
        input.quantity,
        input.variantId,
        input.customImages,
      );
      this.deps.events?.emit({
        type: 'cart.item_added',
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity,
      });
      return this.viewFromCart(cart);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async updateItem(input: UpdateCartItemInput): Promise<CartResult<CartView>> {
    try {
      const cart = await this.updatePersistedItem(
        input.userId,
        input.productId,
        input.quantity,
        input.variantId,
        input.customImages,
      );
      this.deps.events?.emit({
        type: 'cart.item_updated',
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity,
      });
      return this.viewFromCart(cart);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async removeItem(input: RemoveCartItemInput): Promise<CartResult<CartView>> {
    try {
      const cart = await this.removePersistedItem(
        input.userId,
        input.productId,
        input.variantId,
        input.customImages,
      );
      this.deps.events?.emit({
        type: 'cart.item_removed',
        productId: input.productId,
        variantId: input.variantId,
      });
      return this.viewFromCart(cart);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async clearDiscount(input: GetCartInput): Promise<CartResult<CartView>> {
    try {
      const cart = await this.updatePersistedDiscount(input.userId, null);
      this.deps.events?.emit({ type: 'cart.discount_cleared' });
      return this.viewFromCart(cart);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async applyDiscount(input: ApplyDiscountInput): Promise<CartResult<CartView>> {
    try {
      const existing = await this.getPersistedCart(input.userId);
      if (!existing || existing.items.length === 0) {
        return cartErr('cart_empty', 'Add items before applying a discount.');
      }

      if (this.deps.discountService) {
        const subtotal = calculateCartTotal(existing.items);
        const validation = await this.deps.discountService.validateDiscount(
          input.code,
          subtotal,
          input.userId,
          undefined,
          [],
          {
            lineItems: existing.items.map((item) => ({
              ...item,
              unitPrice: item.priceSnapshot,
            })),
          },
        );
        if (!validation.valid) {
          const isExpired = validation.message?.toLowerCase().includes('expired');
          return cartErr(
            isExpired ? 'discount_invalid' : 'discount_invalid',
            validation.message || 'Discount is not valid.',
          );
        }
      }

      const cart = await this.updatePersistedDiscount(input.userId, input.code.trim().toUpperCase());
      this.deps.events?.emit({ type: 'cart.discount_applied', code: input.code.trim().toUpperCase() });
      return this.viewFromCart(cart);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async clearCart(input: ClearCartInput): Promise<CartResult<CartView>> {
    try {
      await this.deps.cartRepo.clear(input.userId);
      this.deps.events?.emit({ type: 'cart.cleared', userId: input.userId });
      return cartOk(buildEmptyCartView(input.userId));
    } catch (err) {
      return this.mapError(err);
    }
  }

  async validateCart(input: ValidateCartInput): Promise<CartResult<CartValidation>> {
    try {
      let cart = await this.getPersistedCart(input.userId);
      let validation = await this.deps.validation.validate(cart, input.userId);

      const discountStale = validation.issues.some(
        (issue) => issue.code === 'discount_invalid' || issue.code === 'discount_expired',
      );
      if (discountStale && cart?.discountCode) {
        cart = await this.updatePersistedDiscount(input.userId, null);
        this.deps.events?.emit({ type: 'cart.discount_cleared' });
        validation = await this.deps.validation.validate(cart, input.userId);
        validation = { ...validation, requiresRefresh: true };
      }

      return cartOk(validation);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async mergeGuestItems(
    input: ValidateCartInput & {
      items: Array<{
        productId: string;
        quantity: number;
        variantId?: string;
        customImages?: string[];
      }>;
    },
  ): Promise<CartResult<{ cart: CartView; mergeIssues: CartIssue[]; remainingGuestItems: typeof input.items }>> {
    try {
      const mergeResult = await mergeGuestCartItems(input.items, async (item) => {
        try {
          await this.addPersistedItem(
            input.userId,
            item.productId,
            item.quantity,
            item.variantId,
            item.customImages,
          );
          return { ok: true as const };
        } catch (err) {
          return {
            ok: false as const,
            message: err instanceof Error ? err.message : 'Unable to add item to cart.',
          };
        }
      });

      const cart = await this.getPersistedCart(input.userId);
      const view = await this.viewFromCart(cart);
      if (!view.ok) return view;

      return cartOk({
        cart: view.data,
        mergeIssues: mergeResult.issues,
        remainingGuestItems: mergeResult.remainingGuestItems,
      });
    } catch (err) {
      return this.mapError(err);
    }
  }

  async updateNote(input: UpdateCartNoteInput): Promise<CartResult<CartView>> {
    try {
      const cart = await this.updatePersistedNote(input.userId, input.note);
      return this.viewFromCart(cart);
    } catch (err) {
      return this.mapError(err);
    }
  }

  /** Guest/client snapshot builder — read-only product access, no persistence. */
  async previewLineItem(input: PreviewLineItemInput): Promise<CartResult<CartLineItem>> {
    try {
      const product = await this.deps.productReadModel.getProduct(input.productId);
      if (!product) {
        return cartErr('product_not_found', 'Product not found.');
      }
      const availabilityStatus = await this.deps.availabilityReader.resolveStatus(
        product,
        input.quantity,
        input.variantId,
      );
      const line = this.deps.pricingSnapshot.buildLineSnapshot({
        product,
        quantity: input.quantity,
        variantId: input.variantId,
        availabilityStatus,
      });
      return cartOk(line);
    } catch (err) {
      return this.mapError(err);
    }
  }

  private async viewFromCart(cart: Cart | null): Promise<CartResult<CartView>> {
    if (!cart) return cartOk(buildEmptyCartView(''));
    const items = await enrichCartLineItems(
      cart,
      this.deps.productReadModel,
      this.deps.availabilityReader,
    );
    return cartOk(mapCartToView(cart, items));
  }

  private getPersistedCart(userId: string): Promise<Cart | null> {
    return this.deps.cartRepo.getByUserId(userId);
  }

  private async addPersistedItem(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    customImages?: string[],
  ): Promise<Cart> {
    return runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.deps.cartRepo.getByUserId(userId, transaction);
      const items = cart?.items ?? [];
      const product = await this.deps.productReadModel.getProduct(productId, transaction);
      if (!product) throw new ProductNotFoundError(productId);

      const existingQuantity = items
        .filter((item) => item.productId === productId && item.variantId === variantId)
        .reduce((total, item) => total + item.quantity, 0);
      await this.deps.availabilityReader.assertAvailable(
        product,
        existingQuantity + quantity,
        variantId,
      );

      const updatedCart: Cart = {
        ...cart,
        id: userId,
        userId,
        items: addCartItem(items, product, quantity, variantId, customImages),
        updatedAt: new Date(),
      };
      await this.deps.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  private async updatePersistedItem(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    customImages?: string[],
  ): Promise<Cart> {
    return runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.deps.cartRepo.getByUserId(userId, transaction);
      const items = cart?.items ?? [];

      if (quantity === 0) {
        const updatedCart: Cart = {
          ...cart,
          id: userId,
          userId,
          items: removeCartItem(items, productId, variantId, customImages),
          updatedAt: new Date(),
        };
        await this.deps.cartRepo.save(updatedCart, transaction);
        return updatedCart;
      }

      const product = await this.deps.productReadModel.getProduct(productId, transaction);
      if (!product) throw new ProductNotFoundError(productId);

      const targetIndex = items.findIndex((item) =>
        cartLineMatches(item, productId, variantId, customImages),
      );
      const aggregateQuantity = items.reduce((total, item, index) => {
        if (item.productId !== productId || item.variantId !== variantId) return total;
        return total + (index === targetIndex ? quantity : item.quantity);
      }, targetIndex < 0 ? quantity : 0);
      await this.deps.availabilityReader.assertAvailable(product, aggregateQuantity, variantId);

      const updatedCart: Cart = {
        ...cart,
        id: userId,
        userId,
        items: updateCartItemQuantity(
          items,
          productId,
          quantity,
          product,
          variantId,
          customImages,
        ),
        updatedAt: new Date(),
      };
      await this.deps.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  private async removePersistedItem(
    userId: string,
    productId: string,
    variantId?: string,
    customImages?: string[],
  ): Promise<Cart> {
    return runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.deps.cartRepo.getByUserId(userId, transaction);
      const updatedCart: Cart = {
        ...cart,
        id: userId,
        userId,
        items: removeCartItem(cart?.items ?? [], productId, variantId, customImages),
        updatedAt: new Date(),
      };
      await this.deps.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  private async updatePersistedNote(userId: string, note: string): Promise<Cart> {
    return this.updatePersistedMetadata(userId, (cart) => ({ ...cart, note }));
  }

  private async updatePersistedDiscount(userId: string, discountCode: string | null): Promise<Cart> {
    return this.updatePersistedMetadata(userId, (cart) => ({
      ...cart,
      discountCode: discountCode ?? undefined,
    }));
  }

  private async updatePersistedMetadata(
    userId: string,
    update: (cart: Cart) => Cart,
  ): Promise<Cart> {
    return runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.deps.cartRepo.getByUserId(userId, transaction);
      if (!cart) throw new Error(`Cart not found for user ${userId}`);
      const updatedCart = { ...update(cart), updatedAt: new Date() };
      await this.deps.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  private mapError<T>(err: unknown): CartResult<T> {
    if (err instanceof ProductNotFoundError) {
      return cartErr('product_not_found', err.message);
    }
    if (err instanceof InsufficientStockError) {
      return cartErr('insufficient_stock', err.message);
    }
    if (err instanceof Error) {
      return cartErr('internal', err.message, true);
    }
    return cartErr('internal', 'Cart operation failed.', true);
  }
}
