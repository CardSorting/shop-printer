/**
 * UX/session-scoped cart events only — not financial or inventory events.
 */
export type CartUxEvent =
  | { type: 'cart.item_added'; productId: string; variantId?: string; quantity: number }
  | { type: 'cart.item_removed'; productId: string; variantId?: string }
  | { type: 'cart.item_updated'; productId: string; variantId?: string; quantity: number }
  | { type: 'cart.discount_applied'; code: string }
  | { type: 'cart.discount_cleared' }
  | { type: 'cart.expired'; userId: string }
  | { type: 'cart.cleared'; userId: string };

export type CartUxEventListener = (event: CartUxEvent) => void;

export class CartUxEventBus {
  private listeners = new Set<CartUxEventListener>();

  subscribe(listener: CartUxEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: CartUxEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
