import { describe, expect, it } from 'vitest';
import {
  CANONICAL_SUPPORT_STATUSES,
  getSupportStatusLabel,
  isActiveTicketStatus,
  isResolvedTicketStatus,
  normalizeSupportStatus,
} from './supportStatus';

describe('supportStatus', () => {
  it('normalizes legacy statuses for display', () => {
    expect(normalizeSupportStatus('solved')).toBe('resolved');
    expect(normalizeSupportStatus('pending')).toBe('pending_customer');
    expect(normalizeSupportStatus('on_hold')).toBe('pending_internal');
    expect(normalizeSupportStatus('open')).toBe('open');
  });

  it('renders unknown statuses safely', () => {
    expect(getSupportStatusLabel('deleted')).toBe('Unknown');
    expect(getSupportStatusLabel(undefined)).toBe('Unknown');
  });

  it('uses canonical labels only', () => {
    expect(getSupportStatusLabel('pending_customer')).toBe('Pending customer');
    expect(getSupportStatusLabel('solved')).toBe('Resolved');
    expect(CANONICAL_SUPPORT_STATUSES).not.toContain('solved' as never);
    expect(CANONICAL_SUPPORT_STATUSES).not.toContain('pending' as never);
    expect(CANONICAL_SUPPORT_STATUSES).not.toContain('on_hold' as never);
  });

  it('classifies active vs resolved tickets', () => {
    expect(isResolvedTicketStatus('solved')).toBe(true);
    expect(isResolvedTicketStatus('closed')).toBe(true);
    expect(isActiveTicketStatus('pending')).toBe(true);
    expect(isActiveTicketStatus('resolved')).toBe(false);
  });
});
