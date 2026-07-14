/**
 * [LAYER: CORE]
 */
import type { ICartRepository, IProductRepository } from '@domain/repositories';
import type { Cart, CartItem, Product } from '@domain/models';
import {
  addCartItem,
  removeCartItem,
  updateCartItemQuantity,
  calculateCartTotal,
} from '@domain/rules';
import { InsufficientStockError, ProductNotFoundError } from '@domain/errors';
import { runTransaction, getUnifiedDb } from '@infrastructure/firebase/bridge';
import type { InventoryApplicationService } from './inventory/inventoryApplicationService';

export class CartService {
  constructor(
    private cartRepo: ICartRepository,
    private productRepo: IProductRepository,
    private inventory?: Pick<InventoryApplicationService, 'checkAvailability'>,
  ) {}

  async getCart(userId: string): Promise<Cart | null> {
    return this.cartRepo.getByUserId(userId);
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    customImages?: string[]
  ): Promise<Cart> {
    // Production Hardening: Move product lookup INSIDE the transaction.
    // Doing it outside creates a TOCTOU window where stock could change
    // between the check and the cart write.
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.cartRepo.getByUserId(userId, transaction);
      const items = cart?.items ?? [];

      // Transactional product read prevents stale-read race
      const product = await this.productRepo.getById(productId, transaction);
      if (!product) throw new ProductNotFoundError(productId);

      const existingQty = items.find((i) => i.productId === productId && i.variantId === variantId)?.quantity ?? 0;
      await this.assertAvailability(product, existingQty + quantity, variantId);

      const updatedItems = addCartItem(items, product, quantity, variantId, customImages);

      const updatedCart: Cart = {
        id: userId,
        userId,
        items: updatedItems,
        updatedAt: new Date(),
      };

      await this.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  async removeFromCart(userId: string, productId: string, variantId?: string): Promise<Cart> {
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.cartRepo.getByUserId(userId, transaction);
      const items = cart?.items ?? [];
      const updatedItems = removeCartItem(items, productId, variantId);

      const updatedCart: Cart = {
        id: userId,
        userId,
        items: updatedItems,
        updatedAt: new Date(),
      };

      await this.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<Cart> {
    // Production Hardening: Move product lookup INSIDE the transaction
    // to prevent TOCTOU between getById and save.
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.cartRepo.getByUserId(userId, transaction);
      const items = cart?.items ?? [];

      if (quantity === 0) {
        const updatedCart: Cart = {
          id: userId,
          userId,
          items: removeCartItem(items, productId, variantId),
          updatedAt: new Date(),
        };

        await this.cartRepo.save(updatedCart, transaction);
        return updatedCart;
      }

      // Transactional product read
      const product = await this.productRepo.getById(productId, transaction);
      if (!product) throw new ProductNotFoundError(productId);

      await this.assertAvailability(product, quantity, variantId);

      const updatedItems = updateCartItemQuantity(items, productId, quantity, product, variantId);

      const updatedCart: Cart = {
        id: userId,
        userId,
        items: updatedItems,
        updatedAt: new Date(),
      };

      await this.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepo.clear(userId);
  }

  async restoreCartIfEmpty(cart: Cart): Promise<boolean> {
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const existingCart = await this.cartRepo.getByUserId(cart.userId, transaction);
      if (existingCart && existingCart.items.length > 0) return false;

      await this.cartRepo.save({ ...cart, updatedAt: new Date() }, transaction);
      return true;
    });
  }
  
  async updateNote(userId: string, note: string): Promise<Cart> {
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.cartRepo.getByUserId(userId, transaction);
      if (!cart) throw new Error(`Cart not found for user ${userId}`);
      
      const updatedCart: Cart = {
        ...cart,
        note,
        updatedAt: new Date(),
      };
      
      await this.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  async updateDiscountCode(userId: string, discountCode: string | null): Promise<Cart> {
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const cart = await this.cartRepo.getByUserId(userId, transaction);
      if (!cart) throw new Error(`Cart not found for user ${userId}`);

      const updatedCart: Cart = {
        ...cart,
        discountCode: discountCode ?? undefined,
        updatedAt: new Date(),
      };

      await this.cartRepo.save(updatedCart, transaction);
      return updatedCart;
    });
  }

  getCartTotal(items: CartItem[]): number {
    return calculateCartTotal(items);
  }

  private async assertAvailability(product: Product, requestedQty: number, variantId?: string): Promise<void> {
    if (product.isDigital || product.continueSellingWhenOutOfStock || !this.inventory) return;

    const result = await this.inventory.checkAvailability({
      items: [{ productId: product.id, variantId, quantity: requestedQty }],
    });

    if (!result.ok) {
      throw new InsufficientStockError(variantId || product.id, requestedQty, 0);
    }

    if (!result.data.available) {
      const line = result.data.lines.find(
        (entry) => entry.productId === product.id && entry.variantId === variantId,
      ) ?? result.data.lines[0];
      throw new InsufficientStockError(
        variantId || product.id,
        requestedQty,
        line?.available ?? 0,
      );
    }
  }
}
