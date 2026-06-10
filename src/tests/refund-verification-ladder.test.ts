import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefundFlowService } from '@core/refund/RefundFlowService';
import { refundErr } from '@core/refund/refundResult';
import { InMemoryRefundEventLog } from './helpers/inMemoryRefundEventLog';
import { AdminFlowService } from '@core/admin/AdminFlowService';
import { InMemoryAdminOperatorEventLog } from './helpers/inMemoryAdminOperatorEventLog';

function makeRefundFlow(options: {
  processRefund?: ReturnType<typeof vi.fn>;
  orderRepo?: Record<string, ReturnType<typeof vi.fn>>;
  eventLog?: InMemoryRefundEventLog;
}) {
  const eventLog = options.eventLog ?? new InMemoryRefundEventLog();
  return {
    flow: new RefundFlowService(
      {
        processRefund: options.processRefund ?? vi.fn().mockResolvedValue({
          orderId: 'o1',
          amount: 1000,
          status: 'refunded',
          stripeRefundId: 're_123',
          idempotencyKey: 'refund:o1:key-1:1000',
        }),
      } as any,
      {
        getById: vi.fn().mockResolvedValue({
          id: 'o1',
          total: 1000,
          refundedAmount: 0,
          metadata: { processedRefundKeys: [], stripeRefunds: [] },
        }),
        ...(options.orderRepo || {}),
      } as any,
      eventLog,
    ),
    eventLog,
  };
}

const actor = { id: 'admin-1', email: 'admin@test.com' };

describe('Refund verification ladder (money reversal protocol)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[validation] refund requires idempotencyKey', async () => {
    const { flow } = makeRefundFlow({});
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 500,
      idempotencyKey: '   ',
      reason: 'customer request',
      actor,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[validation] refund requires actor', async () => {
    const { flow } = makeRefundFlow({});
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'actor-key',
      reason: 'customer request',
      actor: { id: '  ', email: '' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[validation] refund requires reason', async () => {
    const { flow } = makeRefundFlow({});
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'reason-key',
      reason: '  ',
      actor,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[duplicate refund key] does not double-refund', async () => {
    const processRefund = vi.fn().mockResolvedValue({
      orderId: 'o1',
      amount: 1000,
      status: 'refunded',
      stripeRefundId: 're_123',
      idempotencyKey: 'refund:o1:dup-key:1000',
    });
    const { flow } = makeRefundFlow({ processRefund });
    const input = {
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'dup-key',
      reason: 'customer request',
      actor,
    };

    const first = await flow.createRefund(input);
    const second = await flow.createRefund(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(processRefund).toHaveBeenCalledTimes(1);
  });

  it('[money event log] records refund execution', async () => {
    const { flow, eventLog } = makeRefundFlow({});
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'refund-key-1',
      reason: 'customer request',
      actor,
    });
    expect(result.ok).toBe(true);
    expect(eventLog.events).toHaveLength(1);
    expect(eventLog.events[0]).toMatchObject({
      orderId: 'o1',
      idempotencyKey: 'refund-key-1',
      stripeRefundId: 're_123',
    });
  });

  it('[failure] returns typed RefundResult, not throw', async () => {
    const { flow } = makeRefundFlow({
      processRefund: vi.fn().mockRejectedValue(new Error('Payment processor failed to issue refund.')),
    });
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'fail-key',
      reason: 'customer request',
      actor,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PAYMENT_PROCESSOR_FAILED');
  });

  it('[stripe refund id] returned on success', async () => {
    const { flow } = makeRefundFlow({});
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'stripe-key',
      reason: 'customer request',
      actor,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stripeRefundId).toBe('re_123');
  });
});

describe('Admin refund authorization ladder', () => {
  it('[admin] requestRefund requires reason and elevation', async () => {
    const operatorEventLog = new InMemoryAdminOperatorEventLog();
    const admin = new AdminFlowService({
      checkout: {} as any,
      inventory: {} as any,
      orderService: {} as any,
      orderQueryService: {} as any,
      purchaseOrderService: {} as any,
      authService: {} as any,
      productAdmin: {} as any,
      locationAdmin: {} as any,
      refunds: { createRefund: vi.fn(), getRefundStatus: vi.fn() } as any,
      operatorEventLog,
    });

    const missingReason = await admin.requestRefund({
      actor: { ...actor, role: 'admin', elevated: true },
      orderId: 'o1',
      amount: 1000,
      reason: '  ',
      idempotencyKey: 'admin-refund-1',
    });
    expect(missingReason.ok).toBe(false);

    const missingElevation = await admin.requestRefund({
      actor: { ...actor, role: 'admin', elevated: false },
      orderId: 'o1',
      amount: 1000,
      reason: 'damaged goods',
      idempotencyKey: 'admin-refund-2',
    });
    expect(missingElevation.ok).toBe(false);
    if (missingElevation.ok) return;
    expect(missingElevation.code).toBe('ELEVATION_REQUIRED');
  });

  it('[admin] requestRefund records operator event', async () => {
    const operatorEventLog = new InMemoryAdminOperatorEventLog();
    const admin = new AdminFlowService({
      checkout: {} as any,
      inventory: {} as any,
      orderService: {} as any,
      orderQueryService: {} as any,
      purchaseOrderService: {} as any,
      authService: {} as any,
      productAdmin: {} as any,
      locationAdmin: {} as any,
      refunds: {
        createRefund: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            orderId: 'o1',
            amount: 1000,
            status: 'refunded',
            stripeRefundId: 're_1',
            idempotencyKey: 'admin-refund-3',
          },
        }),
        getRefundStatus: vi.fn(),
      } as any,
      operatorEventLog,
    });

    const result = await admin.requestRefund({
      actor: { ...actor, role: 'admin', elevated: true },
      orderId: 'o1',
      amount: 1000,
      reason: 'duplicate charge',
      idempotencyKey: 'admin-refund-3',
    });

    expect(result.ok).toBe(true);
    expect(operatorEventLog.events.some((event) => event.action === 'order.refund')).toBe(true);
  });
});

describe('Concierge refund protocol ladder', () => {
  const conciergeActor = { id: 'concierge', email: 'concierge@woodbine.com' };

  it('[concierge] duplicate refund does not double-refund', async () => {
    const processRefund = vi.fn().mockResolvedValue({
      orderId: 'o1',
      amount: 500,
      status: 'partially_refunded',
      stripeRefundId: 're_concierge',
      idempotencyKey: 'concierge-refund-session-1-o1-500',
    });
    const { flow } = makeRefundFlow({ processRefund });
    const input = {
      orderId: 'o1',
      amount: 500,
      idempotencyKey: 'concierge-refund-session-1-o1-500',
      reason: 'Concierge autonomous refund for session session-1 (customer: guest@example.com)',
      actor: conciergeActor,
      source: 'concierge' as const,
    };

    const first = await flow.createRefund(input);
    const second = await flow.createRefund(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(processRefund).toHaveBeenCalledTimes(1);
  });

  it('[concierge] refund event log marks source: concierge', async () => {
    const { flow, eventLog } = makeRefundFlow({});
    const result = await flow.createRefund({
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'concierge-refund-key',
      reason: 'Concierge autonomous refund for session session-2 (customer: guest@example.com)',
      actor: conciergeActor,
      source: 'concierge',
    });
    expect(result.ok).toBe(true);
    expect(eventLog.events).toHaveLength(1);
    expect(eventLog.events[0]).toMatchObject({
      source: 'concierge',
      actorId: 'concierge',
    });
  });
});

describe('Refund route seal (proof ladder)', () => {
  it('[seal] no admin refund route imports refundService directly', () => {
    const refundRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/orders/[id]/refund/route.ts'),
      'utf8',
    );
    const orderPatchRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/orders/[id]/route.ts'),
      'utf8',
    );
    expect(refundRoute).toMatch(/services\.admin\.requestRefund/);
    expect(refundRoute).not.toMatch(/services\.refundService/);
    expect(orderPatchRoute).toMatch(/services\.admin\.requestRefund/);
    expect(orderPatchRoute).not.toMatch(/services\.refundService/);
  });

  it('[seal] concierge refund route uses refunds.createRefund, not refundService', () => {
    const conciergeRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/concierge/chat/route.ts'),
      'utf8',
    );
    expect(conciergeRoute).toMatch(/refunds\.createRefund/);
    expect(conciergeRoute).not.toMatch(/\{\s*refundService\s*\}\s*=\s*getInitialServices\(\)/);
    expect(conciergeRoute).not.toMatch(/refundService\.processRefund/);
    expect(conciergeRoute).toMatch(/source:\s*['"]concierge['"]/);
    expect(conciergeRoute).toMatch(/idempotencyKey/);
    expect(conciergeRoute).toMatch(/reason:\s*refundReason/);
    expect(conciergeRoute).toMatch(/actor:\s*conciergeActor/);
  });
});

describe('Refund error mapping', () => {
  it('[typed failure] refundErr is non-throwing contract', () => {
    const result = refundErr('PAYMENT_PROCESSOR_FAILED', 'declined', false);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PAYMENT_PROCESSOR_FAILED');
  });
});
