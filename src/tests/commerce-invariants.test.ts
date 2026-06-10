import { describe, expect, it } from 'vitest';
import {
  verifyCommerceEventInvariants,
  verifyInventoryReservedInvariant,
  verifyRefundCreatedInvariant,
  verifyTicketLinkedOrderInvariant,
} from '@core/commerce/commerceInvariants';
import type { CommerceEventEnvelope } from '@core/commerce/commerceEventTypes';

const checkoutCreated = (orderId: string): CommerceEventEnvelope => ({
  id: 'evt-checkout',
  type: 'checkout.session_created',
  protocol: 'checkout',
  entity: { type: 'order', id: orderId },
  relatedOrderId: orderId,
  correlationId: `order:${orderId}`,
  occurredAt: '2026-01-01T10:00:00.000Z',
  payload: { orderId },
});

const paymentConfirmed = (orderId: string): CommerceEventEnvelope => ({
  id: 'evt-paid',
  type: 'checkout.payment_confirmed',
  protocol: 'checkout',
  entity: { type: 'order', id: orderId },
  relatedOrderId: orderId,
  correlationId: `order:${orderId}`,
  occurredAt: '2026-01-01T10:05:00.000Z',
  payload: { orderId, paymentState: 'paid' },
});

describe('commerce cross-protocol invariants', () => {
  it('refund.created requires paid checkout signal', () => {
    const refundEvent: CommerceEventEnvelope = {
      id: 'evt-refund',
      type: 'refund.created',
      protocol: 'refund',
      entity: { type: 'refund', id: 're_1' },
      relatedOrderId: 'order-1',
      occurredAt: '2026-01-01T11:00:00.000Z',
      payload: { orderId: 'order-1', amount: 1000 },
    };

    expect(verifyRefundCreatedInvariant([], refundEvent)?.code).toBe('REFUND_WITHOUT_PAID_ORDER');
    expect(verifyRefundCreatedInvariant([checkoutCreated('order-1')], refundEvent)).toBeNull();
    expect(verifyRefundCreatedInvariant([paymentConfirmed('order-1')], refundEvent)).toBeNull();
  });

  it('inventory.reserved requires checkout.session_created', () => {
    const reserveEvent: CommerceEventEnvelope = {
      id: 'evt-inv',
      type: 'inventory.reserved',
      protocol: 'inventory',
      entity: { type: 'inventory', id: 'prod-1' },
      relatedOrderId: 'order-1',
      occurredAt: '2026-01-01T10:02:00.000Z',
      payload: { orderId: 'order-1', delta: -1 },
    };

    expect(verifyInventoryReservedInvariant([], reserveEvent)?.code).toBe('INVENTORY_WITHOUT_CHECKOUT');
    expect(verifyInventoryReservedInvariant([checkoutCreated('order-1')], reserveEvent)).toBeNull();
  });

  it('ticket.linked_order requires existing order', () => {
    const linkEvent: CommerceEventEnvelope = {
      id: 'evt-link',
      type: 'ticket.linked_order',
      protocol: 'support',
      entity: { type: 'ticket', id: 'ticket-1' },
      relatedOrderId: 'order-missing',
      occurredAt: '2026-01-01T12:00:00.000Z',
      payload: { orderId: 'order-missing', ticketId: 'ticket-1' },
    };

    expect(verifyTicketLinkedOrderInvariant(false, linkEvent)?.code).toBe('TICKET_LINK_UNKNOWN_ORDER');
    expect(verifyTicketLinkedOrderInvariant(true, linkEvent)).toBeNull();
  });

  it('verifyCommerceEventInvariants scans ordered stream', () => {
    const events = [
      checkoutCreated('order-1'),
      paymentConfirmed('order-1'),
      {
        id: 'evt-refund',
        type: 'refund.created',
        protocol: 'refund' as const,
        entity: { type: 'refund' as const, id: 're_1' },
        relatedOrderId: 'order-1',
        occurredAt: '2026-01-01T11:00:00.000Z',
        payload: { orderId: 'order-1' },
      },
    ];

    expect(verifyCommerceEventInvariants(events)).toEqual([]);
  });
});
