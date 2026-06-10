import type { CartUxEvent } from '@core/cart';

/** Client-side UX/session cart events — not financial events. */
export function emitCartUxEvent(event: CartUxEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cart:ux', { detail: event }));
}
