import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OperationsRuntimeService } from './OperationsRuntimeService';

describe('OperationsRuntimeService procurement hardening', () => {
  const orderQuery = {};
  const productService = {};
  const purchaseOrderService = { createPurchaseOrder: vi.fn() };
  const settingsService = {};
  const audit = { record: vi.fn() };
  let service: OperationsRuntimeService;

  beforeEach(() => {
    vi.clearAllMocks();
    purchaseOrderService.createPurchaseOrder.mockResolvedValue({ id: 'po-1' });
    service = new OperationsRuntimeService(orderQuery as any, productService as any, purchaseOrderService as any, settingsService as any, audit as any);
  });

  it('creates replenishment drafts with real supplier and costed items', async () => {
    await service.executePlan({
      id: 'plan-1',
      status: 'approved',
      proposedOperations: [{
        id: 'op-1',
        tool: 'purchase_order.draft',
        target: 'procurement',
        title: 'Restock',
        description: '',
        diff: '',
        input: { supplier: 'Acme', products: [{ productId: 'p1', suggestedQty: 4, unitCost: 250 }] },
        riskLevel: 'medium',
        requiresApproval: true,
        reversible: true,
        status: 'approved',
      }],
    } as any, { userId: 'admin-1', email: 'admin@example.com', role: 'admin' } as any);

    expect(purchaseOrderService.createPurchaseOrder).toHaveBeenCalledWith(expect.objectContaining({
      supplier: 'Acme',
      items: [{ productId: 'p1', orderedQty: 4, unitCost: 250 }],
      adminUserId: 'admin-1',
      adminUserEmail: 'admin@example.com',
    }));
  });

  it('fails procurement execution instead of creating placeholder purchase orders', async () => {
    const plan = await service.executePlan({
      id: 'plan-1',
      status: 'approved',
      proposedOperations: [{
        id: 'op-1',
        tool: 'purchase_order.draft',
        target: 'procurement',
        title: 'Restock',
        description: '',
        diff: '',
        input: { products: [{ productId: 'p1', suggestedQty: 4 }] },
        riskLevel: 'medium',
        requiresApproval: true,
        reversible: true,
        status: 'approved',
      }],
    } as any, { userId: 'admin-1', email: 'admin@example.com', role: 'admin' } as any);

    expect(plan.proposedOperations[0].status).toBe('failed');
    expect(purchaseOrderService.createPurchaseOrder).not.toHaveBeenCalled();
  });
});
