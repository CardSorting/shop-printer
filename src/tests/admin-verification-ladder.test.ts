import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFlowService } from '@core/admin/AdminFlowService';
import { ProductAdminService } from '@core/admin/ProductAdminService';
import { adminErr } from '@core/admin/adminResult';
import { InMemoryAdminOperatorEventLog } from './helpers/inMemoryAdminOperatorEventLog';

function makeAdminFlow(options: {
  checkout?: Record<string, ReturnType<typeof vi.fn>>;
  inventory?: Record<string, ReturnType<typeof vi.fn>>;
  productAdmin?: Record<string, ReturnType<typeof vi.fn>>;
  locationAdmin?: Record<string, ReturnType<typeof vi.fn>>;
  orderService?: Record<string, ReturnType<typeof vi.fn>>;
  refunds?: Record<string, ReturnType<typeof vi.fn>>;
  authService?: Record<string, ReturnType<typeof vi.fn>>;
  operatorEventLog?: InMemoryAdminOperatorEventLog;
}) {
  const operatorEventLog = options.operatorEventLog ?? new InMemoryAdminOperatorEventLog();
  const productAdmin = {
    createProduct: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test', handle: 'test' }),
    updateProduct: vi.fn().mockResolvedValue({ id: 'p1', name: 'Updated' }),
    archiveProduct: vi.fn().mockResolvedValue(undefined),
    batchUpdateProducts: vi.fn().mockResolvedValue([]),
    batchArchiveProducts: vi.fn().mockResolvedValue(undefined),
    batchCreateProducts: vi.fn().mockResolvedValue([]),
    ...options.productAdmin,
  };
  const locationAdmin = {
    listLocations: vi.fn().mockResolvedValue([]),
    getLocation: vi.fn().mockResolvedValue(null),
    createLocation: vi.fn().mockResolvedValue({ id: 'loc-1', name: 'Warehouse' }),
    updateLocation: vi.fn().mockResolvedValue({ id: 'loc-1', name: 'Updated' }),
    archiveLocation: vi.fn().mockResolvedValue({ id: 'loc-1', isActive: false }),
    ...options.locationAdmin,
  };

  return {
    flow: new AdminFlowService({
      checkout: {
        handleReconciliationOperatorAction: vi.fn().mockResolvedValue({ ok: true, data: { applied: true } }),
        ...options.checkout,
      } as any,
      inventory: {
        adjustInventory: vi.fn().mockResolvedValue({ ok: true, data: { adjustments: [] } }),
        ...options.inventory,
      } as any,
      orderService: {
        updateOrderStatus: vi.fn().mockResolvedValue(undefined),
        batchUpdateOrderStatus: vi.fn().mockResolvedValue({ updatedIds: ['o1'] }),
        updateOrderFulfillment: vi.fn().mockResolvedValue(undefined),
        resolveReconciliation: vi.fn().mockResolvedValue(undefined),
        addOrderNote: vi.fn().mockResolvedValue({ id: 'n1', text: 'note' }),
        ...options.orderService,
      } as any,
      orderQueryService: {} as any,
      purchaseOrderService: {
        submitOrder: vi.fn().mockResolvedValue({ id: 'po-1' }),
        cancelOrder: vi.fn().mockResolvedValue({ id: 'po-1' }),
        closeOrder: vi.fn().mockResolvedValue({ id: 'po-1' }),
        receiveItems: vi.fn().mockResolvedValue({ session: { id: 's1' }, inventoryUpdates: [] }),
      } as any,
      refunds: {
        createRefund: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            orderId: 'o1',
            amount: 1000,
            status: 'refunded',
            stripeRefundId: 're_1',
            idempotencyKey: 'refund-1',
          },
        }),
        getRefundStatus: vi.fn().mockResolvedValue({ ok: true, data: { stripeRefunds: [], refundableBalance: 0 } }),
        ...options.refunds,
      } as any,
      authService: {
        getAllUsers: vi.fn().mockResolvedValue([]),
        updateUser: vi.fn().mockResolvedValue({ id: 'u1', role: 'admin' }),
        ...options.authService,
      } as any,
      productAdmin: productAdmin as unknown as ProductAdminService,
      locationAdmin: locationAdmin as any,
      operatorEventLog,
    }),
    operatorEventLog,
    productAdmin,
    locationAdmin,
  };
}

const actor = { id: 'admin-1', email: 'admin@test.com', role: 'admin' as const };

describe('Admin verification ladder (operator authority protocol)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[product create] records operator event on mutation', async () => {
    const { flow, operatorEventLog } = makeAdminFlow({});
    const result = await flow.createProduct({
      actor,
      draft: { name: 'Widget', handle: 'widget', price: 10 } as any,
      idempotencyKey: 'create:widget:1',
    });
    expect(result.ok).toBe(true);
    expect(operatorEventLog.events).toHaveLength(1);
    expect(operatorEventLog.events[0]).toMatchObject({
      action: 'product.create',
      targetType: 'product',
      actorId: actor.id,
    });
  });

  it('[inventory adjust] duplicate idempotency key does not double-mutate', async () => {
    const adjustInventory = vi.fn().mockResolvedValue({ ok: true, data: { adjustments: [] } });
    const { flow } = makeAdminFlow({ inventory: { adjustInventory } });
    const input = {
      actor,
      updates: [{ productId: 'p1', stock: 5 }],
      idempotencyKey: 'admin-batch:dup-test',
    };

    const first = await flow.adjustInventory(input);
    const second = await flow.adjustInventory(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(adjustInventory).toHaveBeenCalledTimes(1);
  });

  it('[reconciliation] delegates to checkout protocol', async () => {
    const handleReconciliationOperatorAction = vi.fn().mockResolvedValue({ ok: true, data: { applied: true } });
    const { flow } = makeAdminFlow({ checkout: { handleReconciliationOperatorAction } });

    const result = await flow.resolveReconciliationCase({
      actor,
      caseId: 'case-1',
      action: 'mark_resolved',
      reason: 'verified manually',
      idempotencyKey: 'recon:case-1',
    });

    expect(result.ok).toBe(true);
    expect(handleReconciliationOperatorAction).toHaveBeenCalledWith({
      caseId: 'case-1',
      action: 'mark_resolved',
      reason: 'verified manually',
      actor: { id: actor.id, email: actor.email },
    });
  });

  it('[user role] requires elevated actor', async () => {
    const { flow } = makeAdminFlow({});
    const result = await flow.updateUserRole({
      actor: { ...actor, elevated: false },
      userId: 'u2',
      role: 'admin',
      reason: 'promotion',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('ELEVATION_REQUIRED');
  });

  it('[expected failures] map validation to AdminResult, not throw', async () => {
    const { flow } = makeAdminFlow({});
    const result = await flow.archiveProduct({
      actor,
      productId: 'p1',
      reason: '   ',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[forbidden mapping] adminErr FORBIDDEN is non-retryable', () => {
    const result = adminErr('FORBIDDEN', 'Not allowed', false);
    expect(result.retryable).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('[order status] duplicate idempotency key does not double-mutate', async () => {
    const updateOrderStatus = vi.fn().mockResolvedValue(undefined);
    const { flow } = makeAdminFlow({ orderService: { updateOrderStatus } });
    const input = {
      actor,
      orderId: 'o1',
      status: 'processing' as const,
      idempotencyKey: 'order-status:o1:dup',
    };
    const first = await flow.updateOrderStatus(input);
    const second = await flow.updateOrderStatus(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(updateOrderStatus).toHaveBeenCalledTimes(1);
  });

  it('[PO cancel] requires reason', async () => {
    const { flow } = makeAdminFlow({});
    const result = await flow.cancelPurchaseOrder({
      actor,
      purchaseOrderId: 'po-1',
      reason: '  ',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('[location archive] records operator event', async () => {
    const { flow, operatorEventLog } = makeAdminFlow({});
    const result = await flow.archiveLocation({
      actor,
      locationId: 'loc-1',
      reason: 'closed warehouse',
      idempotencyKey: 'loc-archive:1',
    });
    expect(result.ok).toBe(true);
    expect(operatorEventLog.events.some((e) => e.action === 'location.archive')).toBe(true);
  });
});

describe('Admin route seal (proof ladder)', () => {
  it('[seal] product create route only calls services.admin.createProduct', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/products/route.ts'), 'utf8');
    expect(source).toMatch(/services\.admin\.createProduct/);
    expect(source).not.toMatch(/services\.productService\.createProduct/);
  });

  it('[seal] product update route only calls services.admin.updateProduct', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/products/[id]/route.ts'), 'utf8');
    expect(source).toMatch(/services\.admin\.updateProduct/);
    expect(source).not.toMatch(/services\.productService\.updateProduct/);
  });

  it('[seal] inventory adjustment route only calls services.admin.adjustInventory', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/inventory/batch/route.ts'), 'utf8');
    expect(source).toMatch(/services\.admin\.adjustInventory/);
    expect(source).not.toMatch(/services\.inventory\.adjustInventory/);
  });

  it('[seal] PO receive route only calls services.admin.receivePurchaseOrder', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/purchase-orders/[id]/route.ts'),
      'utf8',
    );
    expect(source).toMatch(/services\.admin\.receivePurchaseOrder/);
    expect(source).not.toMatch(/purchaseOrderService\.receiveItems/);
  });

  it('[seal] reconciliation action route only calls services.admin.resolveReconciliationCase', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/reconciliation/cases/route.ts'),
      'utf8',
    );
    expect(source).toMatch(/services\.admin\.resolveReconciliationCase/);
    expect(source).not.toMatch(/services\.checkout\.handleReconciliationOperatorAction/);
  });

  it('[seal] user role route calls services.admin.updateUserRole for role changes', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/auth/users/[id]/route.ts'), 'utf8');
    expect(source).toMatch(/services\.admin\.updateUserRole/);
  });
});

describe('Admin ghost sweep phase 2 (proof ladder)', () => {
  const orderRouteDir = path.join(process.cwd(), 'src/app/api/admin/orders');

  function readOrderRoutes(): string[] {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'route.ts') files.push(fs.readFileSync(full, 'utf8'));
      }
    };
    walk(orderRouteDir);
    return files;
  }

  it('[seal] no admin order route imports OrderService', () => {
    for (const source of readOrderRoutes()) {
      expect(source).not.toMatch(/services\.orderService/);
    }
  });

  it('[seal] order mutation routes call services.admin', () => {
    const mutationRoutes = [
      'src/app/api/admin/orders/[id]/route.ts',
      'src/app/api/admin/orders/[id]/fulfillment/route.ts',
      'src/app/api/admin/orders/[id]/reconcile/route.ts',
      'src/app/api/admin/orders/[id]/notes/route.ts',
      'src/app/api/admin/orders/batch/route.ts',
      'src/app/api/admin/orders/import/tracking/route.ts',
    ];
    for (const route of mutationRoutes) {
      const source = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      expect(source).toMatch(/services\.admin\./);
    }
  });

  it('[seal] no PO action route imports PurchaseOrderService mutations', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/purchase-orders/[id]/route.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/purchaseOrderService\.(submitOrder|cancelOrder|closeOrder|receiveItems)/);
    expect(source).toMatch(/services\.admin\.(submitPurchaseOrder|cancelPurchaseOrder|closePurchaseOrder|receivePurchaseOrder)/);
  });

  it('[seal] no location route imports Firestore repos', () => {
    const locationRoutes = [
      'src/app/api/admin/locations/route.ts',
      'src/app/api/admin/locations/[id]/route.ts',
    ];
    for (const route of locationRoutes) {
      const source = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      expect(source).not.toMatch(/inventoryLocationRepo|auditService\.record/);
      expect(source).toMatch(/services\.admin\./);
    }
  });

  it('[seal] product batch routes call services.admin', () => {
    const batchRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/products/batch/route.ts'), 'utf8');
    const createRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/products/batch/create/route.ts'), 'utf8');
    expect(batchRoute).toMatch(/services\.admin\.batchUpdateProducts/);
    expect(batchRoute).toMatch(/services\.admin\.batchArchiveProducts/);
    expect(batchRoute).not.toMatch(/services\.productService/);
    expect(createRoute).toMatch(/services\.admin\.batchCreateProducts/);
    expect(createRoute).not.toMatch(/services\.productService/);
  });
});
