import { describe, expect, it } from 'vitest';
import {
  parseTicketBatchUpdate,
  parseTicketHeartbeat,
  parseTicketListOptions,
  parseTicketPriorityUpdate,
  parseTicketProperties,
  parseTicketStatusUpdate,
} from './parsers';

describe('admin ticket parsers', () => {
  it('bounds list options and validates status/priority enums', () => {
    expect(parseTicketListOptions(new URLSearchParams('status=open&limit=500'))).toEqual({ status: 'open', limit: 100 });
    expect(parseTicketStatusUpdate({ status: 'solved' })).toBe('resolved');
    expect(parseTicketPriorityUpdate({ priority: 'urgent' })).toBe('urgent');
    expect(() => parseTicketListOptions(new URLSearchParams('status=deleted'))).toThrow('Ticket status is invalid');
    expect(() => parseTicketPriorityUpdate({ priority: 'critical' })).toThrow('Ticket priority is invalid');
  });

  it('allows only explicit mutable ticket properties', () => {
    const properties = parseTicketProperties({
      status: 'open',
      priority: 'high',
      type: 'incident',
      tags: ['VIP', 'vip', '  Shipping '],
      messages: [{ content: 'ignored' }],
      userId: 'customer-1',
    });

    expect(properties).toEqual({
      status: 'open',
      priority: 'high',
      type: 'incident',
      tags: ['vip', 'shipping'],
    });
  });

  it('rejects oversized or duplicate batch updates and validates heartbeat identity', () => {
    expect(parseTicketHeartbeat({ userId: 'u1', userName: 'Admin' })).toEqual({ userId: 'u1', userName: 'Admin' });
    expect(() => parseTicketBatchUpdate({ ids: ['t1', 't1'], updates: { status: 'open' } })).toThrow('Duplicate ticket ids');
    expect(() => parseTicketBatchUpdate({ ids: ['t1'], updates: { messages: [] } })).toThrow('At least one ticket property is required');
    expect(() => parseTicketBatchUpdate({ ids: Array.from({ length: 101 }, (_, index) => `t-${index}`), updates: { status: 'open' } })).toThrow('limited to 100');
  });
});
