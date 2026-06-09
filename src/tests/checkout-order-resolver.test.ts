import { describe, expect, it, vi } from 'vitest';
import {
  assertCheckoutOrderMetadataMatch,
  resolveCheckoutOrderByPaymentIntent,
} from '../core/order/checkoutOrderResolver';
import { DomainError } from '@domain/errors';

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    status: 'pending',
    paymentTransactionId: null,
    ...overrides,
  };
}

describe('checkoutOrderResolver', () => {
  it('resolves by payment transaction id first', async () => {
    const order = makeOrder({ paymentTransactionId: 'pi_123' });
    const orderRepo = {
      getByPaymentTransactionId: vi.fn().mockResolvedValue(order),
      getById: vi.fn(),
    };

    const result = await resolveCheckoutOrderByPaymentIntent(orderRepo as any, 'pi_123');

    expect(result).toEqual({
      found: true,
      order,
      source: 'payment_transaction_id',
      linkedPaymentTransaction: false,
    });
    expect(orderRepo.getById).not.toHaveBeenCalled();
  });

  it('falls back to stripe metadata and links missing payment transaction id', async () => {
    const order = makeOrder({ id: 'order-meta', paymentTransactionId: null });
    const orderRepo = {
      getByPaymentTransactionId: vi.fn().mockResolvedValue(null),
      getById: vi.fn().mockResolvedValue(order),
      updatePaymentTransactionId: vi.fn().mockResolvedValue(undefined),
    };

    const result = await resolveCheckoutOrderByPaymentIntent(orderRepo as any, 'pi_meta', {
      stripeMetadataOrderId: 'order-meta',
      linkMissingPaymentTransaction: true,
    });

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.source).toBe('stripe_metadata');
      expect(result.linkedPaymentTransaction).toBe(true);
      expect(result.order.paymentTransactionId).toBe('pi_meta');
    }
    expect(orderRepo.updatePaymentTransactionId).toHaveBeenCalledWith('order-meta', 'pi_meta', undefined);
  });

  it('returns mapping mismatch when metadata order points at a different payment intent', async () => {
    const orderRepo = {
      getByPaymentTransactionId: vi.fn().mockResolvedValue(null),
      getById: vi.fn().mockResolvedValue(makeOrder({
        id: 'order-mismatch',
        paymentTransactionId: 'pi_other',
      })),
    };

    const result = await resolveCheckoutOrderByPaymentIntent(orderRepo as any, 'pi_new', {
      stripeMetadataOrderId: 'order-mismatch',
    });

    expect(result).toEqual({
      found: false,
      reason: 'mapping_mismatch',
      orderId: 'order-mismatch',
      existingPaymentIntentId: 'pi_other',
    });
  });

  it('rejects metadata order id mismatches', () => {
    expect(() => assertCheckoutOrderMetadataMatch(makeOrder({ id: 'order-1' }) as any, 'order-2'))
      .toThrow(DomainError);
  });
});
