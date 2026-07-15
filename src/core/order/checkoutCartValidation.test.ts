import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@domain/errors';
import { CheckoutMutationService } from './checkoutMutationService';

describe('checkout cart validation gate', () => {
  it('blocks checkout with clear reasons when cart validation fails', async () => {
    const cartIntent = {
      validateCart: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          valid: false,
          requiresRefresh: true,
          issues: [
            { code: 'pricing_changed', message: 'Price changed for Poster.', productId: 'p1' },
            { code: 'out_of_stock', message: 'Poster is out of stock.', productId: 'p1' },
          ],
        },
      }),
    };

    const service = new CheckoutMutationService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      cartIntent,
    );

    await expect(
      service.runCheckoutReservation({
        userId: 'u1',
        shippingAddress: { street: '1 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
        idempotencyKey: 'attempt-1',
      }),
    ).rejects.toThrow(DomainError);

    await expect(
      service.runCheckoutReservation({
        userId: 'u1',
        shippingAddress: { street: '1 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
        idempotencyKey: 'attempt-2',
      }),
    ).rejects.toThrow('Price changed for Poster. Poster is out of stock.');
  });
});
