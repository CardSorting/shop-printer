import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportFlowService } from '@core/support/SupportFlowService';
import { supportErr } from '@core/support/supportResult';
import { InMemorySupportEventLog } from './helpers/inMemorySupportEventLog';

function makeSupportFlow(options: {
  ticketRepo?: Record<string, ReturnType<typeof vi.fn>>;
  eventLog?: InMemorySupportEventLog;
}) {
  const eventLog = options.eventLog ?? new InMemorySupportEventLog();
  const ticketRepo = {
    getTicketById: vi.fn().mockResolvedValue({
      id: 't1',
      userId: 'cust-1',
      customerEmail: 'cust@test.com',
      subject: 'Help',
      status: 'open',
      priority: 'medium',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createTicket: vi.fn().mockResolvedValue(undefined),
    updateTicketProperties: vi.fn().mockResolvedValue(undefined),
    updateTicketStatus: vi.fn().mockResolvedValue(undefined),
    addMessage: vi.fn().mockResolvedValue(undefined),
    getTickets: vi.fn().mockResolvedValue([]),
    getTicketHealthMetrics: vi.fn().mockResolvedValue({ slaCompliance: 100, unassignedRate: 0, totalActive: 0 }),
    getCustomerSupportSummary: vi.fn().mockResolvedValue({ totalTickets: 0, resolvedCount: 0, totalSpend: 0, recentOrders: [] }),
    getMacros: vi.fn().mockResolvedValue([]),
    ...(options.ticketRepo || {}),
  };

  return {
    flow: new SupportFlowService({ ticketRepo: ticketRepo as any, eventLog }),
    eventLog,
    ticketRepo,
  };
}

const actor = { id: 'admin-1', email: 'admin@test.com' };

describe('Support verification ladder (issue resolution protocol)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[validation] ticket mutations require idempotencyKey', async () => {
    const { flow } = makeSupportFlow({});
    const result = await flow.createTicket({
      actor,
      source: 'admin',
      idempotencyKey: '   ',
      userId: 'cust-1',
      customerEmail: 'cust@test.com',
      subject: 'Need help',
      message: 'Please assist',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[validation] close and reopen require actor', async () => {
    const { flow } = makeSupportFlow({});
    const closeResult = await flow.closeTicket({
      actor: { id: '  ' },
      source: 'admin',
      idempotencyKey: 'close-key',
      ticketId: 't1',
    });
    expect(closeResult.ok).toBe(false);
    if (closeResult.ok) return;
    expect(closeResult.code).toBe('VALIDATION_FAILED');

    const reopenResult = await flow.reopenTicket({
      actor: { id: '' },
      source: 'admin',
      idempotencyKey: 'reopen-key',
      ticketId: 't1',
      reason: 'Customer replied',
    });
    expect(reopenResult.ok).toBe(false);
    if (reopenResult.ok) return;
    expect(reopenResult.code).toBe('VALIDATION_FAILED');
  });

  it('[validation] reopen requires reason', async () => {
    const { flow } = makeSupportFlow({});
    const result = await flow.reopenTicket({
      actor,
      source: 'admin',
      idempotencyKey: 'reopen-reason-key',
      ticketId: 't1',
      reason: '  ',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[duplicate ticket create] does not double-write', async () => {
    const createTicket = vi.fn().mockResolvedValue(undefined);
    const { flow, eventLog } = makeSupportFlow({ ticketRepo: { createTicket } });
    const input = {
      actor,
      source: 'customer' as const,
      idempotencyKey: 'ticket-create-dup',
      userId: 'cust-1',
      customerEmail: 'cust@test.com',
      subject: 'Need help',
      message: 'Please assist',
    };

    const first = await flow.createTicket(input);
    expect(first.ok).toBe(true);
    expect(createTicket).toHaveBeenCalledTimes(1);

    await eventLog.markMutationCompleted('ticket-create-dup');
    eventLog.events.push({
      id: 'evt-1',
      actorId: actor.id,
      source: 'customer',
      action: 'ticket.created',
      ticketId: 't1',
      customerId: 'cust-1',
      idempotencyKey: 'ticket-create-dup',
      createdAt: new Date().toISOString(),
    });

    const second = await flow.createTicket(input);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(createTicket).toHaveBeenCalledTimes(1);
  });

  it('[event log] records support mutation events', async () => {
    const { flow, eventLog } = makeSupportFlow({});
    const result = await flow.closeTicket({
      actor,
      source: 'admin',
      idempotencyKey: 'close-event-key',
      ticketId: 't1',
      reason: 'Resolved in chat',
    });
    expect(result.ok).toBe(true);
    expect(eventLog.events.some((event) => event.action === 'ticket.closed')).toBe(true);
  });

  it('[proof ladder] no CRM/support route imports ticket repository directly', () => {
    const apiRoot = path.join(process.cwd(), 'src/app/api');
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        const rel = path.relative(apiRoot, fullPath);
        const isTarget =
          rel.startsWith('admin/customers/') ||
          rel.startsWith('admin/tickets/') ||
          rel.startsWith('support/') ||
          rel.startsWith('concierge/') ||
          rel.startsWith('tickets/');
        if (!isTarget) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('ticketRepository') || content.includes('FirestoreTicketRepository')) {
          offenders.push(rel);
        }
      }
    }

    walk(apiRoot);
    expect(offenders).toEqual([]);
  });
});
