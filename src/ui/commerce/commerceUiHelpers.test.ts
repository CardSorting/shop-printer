import { describe, expect, it } from 'vitest';
import {
  canonicalOrderStatusLabel,
  canonicalTicketStatusLabel,
  formatCommerceTimelineEvent,
} from './commerceUiHelpers';

describe('commerce UI helpers', () => {
  it('canonicalOrderStatusLabel maps order statuses', () => {
    expect(canonicalOrderStatusLabel('pending')).toBe('Pending payment');
    expect(canonicalOrderStatusLabel('ready_for_pickup')).toBe('Ready for pickup');
  });

  it('canonicalTicketStatusLabel normalizes legacy support statuses', () => {
    expect(canonicalTicketStatusLabel('solved')).toBe('Resolved');
    expect(canonicalTicketStatusLabel('pending_customer')).toBe('Pending customer');
  });

  it('formatCommerceTimelineEvent renders operator-readable text', () => {
    const text = formatCommerceTimelineEvent({
      id: 'e1',
      type: 'checkout.payment_confirmed',
      protocol: 'checkout',
      label: 'Payment confirmed',
      occurredAt: '2026-01-01T10:00:00.000Z',
      payload: {},
      actor: { id: 'system', type: 'system' },
    });
    expect(text).toContain('Payment confirmed');
    expect(text).toContain('checkout');
  });
});
