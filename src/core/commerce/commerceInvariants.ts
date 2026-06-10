import type { CommerceEventEnvelope } from './commerceEventTypes';

export type CommerceInvariantViolation = {
  code: string;
  message: string;
  eventType: string;
};

export function verifyRefundCreatedInvariant(
  priorEvents: CommerceEventEnvelope[],
  refundEvent: CommerceEventEnvelope,
): CommerceInvariantViolation | null {
  if (refundEvent.type !== 'refund.created') return null;
  const orderId = refundEvent.relatedOrderId ?? (refundEvent.payload as { orderId?: string }).orderId;
  if (!orderId) {
    return {
      code: 'REFUND_MISSING_ORDER',
      message: 'refund.created must reference an order.',
      eventType: refundEvent.type,
    };
  }

  const paidSignals = priorEvents.filter((event) =>
    event.relatedOrderId === orderId
    && (
      event.type === 'checkout.payment_confirmed'
      || event.type === 'checkout.session_created'
      || (event.protocol === 'checkout' && (event.payload as { paymentState?: string }).paymentState === 'paid')
    ),
  );

  if (paidSignals.length === 0) {
    return {
      code: 'REFUND_WITHOUT_PAID_ORDER',
      message: 'refund.created must correspond to a paid checkout session.',
      eventType: refundEvent.type,
    };
  }
  return null;
}

export function verifyInventoryReservedInvariant(
  priorEvents: CommerceEventEnvelope[],
  inventoryEvent: CommerceEventEnvelope,
): CommerceInvariantViolation | null {
  if (inventoryEvent.type !== 'inventory.reserved') return null;
  const orderId = inventoryEvent.relatedOrderId;
  if (!orderId) {
    return {
      code: 'INVENTORY_RESERVE_MISSING_ORDER',
      message: 'inventory.reserved must reference an order.',
      eventType: inventoryEvent.type,
    };
  }

  const checkoutCreated = priorEvents.some((event) =>
    event.relatedOrderId === orderId
    && (event.type === 'checkout.session_created' || event.type === 'checkout.payment_confirmed'),
  );

  if (!checkoutCreated) {
    return {
      code: 'INVENTORY_WITHOUT_CHECKOUT',
      message: 'inventory.reserved must correspond to checkout.session_created.',
      eventType: inventoryEvent.type,
    };
  }
  return null;
}

export function verifyTicketLinkedOrderInvariant(
  orderExists: boolean,
  linkEvent: CommerceEventEnvelope,
): CommerceInvariantViolation | null {
  if (linkEvent.type !== 'ticket.linked_order') return null;
  const orderId = linkEvent.relatedOrderId ?? (linkEvent.payload as { orderId?: string }).orderId;
  if (!orderId) {
    return {
      code: 'TICKET_LINK_MISSING_ORDER',
      message: 'ticket.linked_order must include an order id.',
      eventType: linkEvent.type,
    };
  }
  if (!orderExists) {
    return {
      code: 'TICKET_LINK_UNKNOWN_ORDER',
      message: 'ticket.linked_order must reference an existing order.',
      eventType: linkEvent.type,
    };
  }
  return null;
}

export function verifyCommerceEventInvariants(
  events: CommerceEventEnvelope[],
  options?: { orderExists?: (orderId: string) => boolean },
): CommerceInvariantViolation[] {
  const violations: CommerceInvariantViolation[] = [];
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const prior = sorted.slice(0, index);
    const current = sorted[index];

    const refundViolation = verifyRefundCreatedInvariant(prior, current);
    if (refundViolation) violations.push(refundViolation);

    const inventoryViolation = verifyInventoryReservedInvariant(prior, current);
    if (inventoryViolation) violations.push(inventoryViolation);

    if (current.type === 'ticket.linked_order') {
      const orderId = current.relatedOrderId ?? (current.payload as { orderId?: string }).orderId ?? '';
      const orderExists = options?.orderExists ? options.orderExists(orderId) : true;
      const ticketViolation = verifyTicketLinkedOrderInvariant(orderExists, current);
      if (ticketViolation) violations.push(ticketViolation);
    }
  }

  return violations;
}
