import type { Cart } from '@domain/models';
import { CartService } from '../CartService';

/**
 * Persistence adapter — cart store holds intent, not inventory truth.
 */
export class CartStore {
  constructor(private cartService: CartService) {}

  get(userId: string): Promise<Cart | null> {
    return this.cartService.getCart(userId);
  }

  add(userId: string, productId: string, quantity: number, variantId?: string): Promise<Cart> {
    return this.cartService.addToCart(userId, productId, quantity, variantId);
  }

  updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<Cart> {
    return this.cartService.updateQuantity(userId, productId, quantity, variantId);
  }

  remove(userId: string, productId: string, variantId?: string): Promise<Cart> {
    return this.cartService.removeFromCart(userId, productId, variantId);
  }

  clear(userId: string): Promise<void> {
    return this.cartService.clearCart(userId);
  }

  updateNote(userId: string, note: string): Promise<Cart> {
    return this.cartService.updateNote(userId, note);
  }

  applyDiscountCode(userId: string, code: string): Promise<Cart> {
    return this.cartService.updateDiscountCode(userId, code.trim().toUpperCase());
  }

  clearDiscountCode(userId: string): Promise<Cart> {
    return this.cartService.updateDiscountCode(userId, null);
  }
}
