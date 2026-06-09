import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInventoryStack } from '@core/inventory/createInventoryStack';
import {
  InMemoryInventoryLedgerRepository,
  InMemoryInventoryLevelRepository,
  InMemoryInventoryReconciliationRepository,
  InMemoryInventoryReservationRepository,
} from './helpers/inMemoryInventoryStores';

function makeReceiveStack(stockByProduct: Record<string, number> = { p1: 0 }) {
  const stocks = { ...stockByProduct };
  const productRepo = {
    getById: vi.fn(async (id: string) => ({
      id,
      stock: stocks[id] ?? 0,
      variants: [],
    })),
    getAll: vi.fn(async () => ({ products: Object.keys(stocks).map((id) => ({ id, stock: stocks[id] })) })),
    batchUpdateStock: vi.fn(async (updates: Array<{ id: string; delta: number }>) => {
      for (const update of updates) {
        stocks[update.id] = (stocks[update.id] ?? 0) + update.delta;
      }
    }),
  };

  const ledgerRepo = new InMemoryInventoryLedgerRepository();
  const levelRepo = new InMemoryInventoryLevelRepository();
  const stack = createInventoryStack({
    productRepo: productRepo as any,
    ledgerRepo,
    reservationRepo: new InMemoryInventoryReservationRepository(),
    reconciliationRepo: new InMemoryInventoryReconciliationRepository(),
    inventoryLevelRepo: levelRepo,
  });

  return { ...stack, productRepo, stocks, ledgerRepo, levelRepo };
}

const receiveInput = {
  items: [{ productId: 'p1', delta: 5, locationId: 'warehouse-a' }],
  idempotencyKey: 'po-receive:po-1:session-1',
  actor: 'admin' as const,
  reason: 'location_receive' as const,
  purchaseOrderId: 'po-1',
};

describe('Inventory Location Consistency Proof Ladder (sealed movement protocol)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[PO receive] updates catalog quantity once', async () => {
    const { inventory, stocks, productRepo } = makeReceiveStack({ p1: 2 });
    const result = await inventory.receiveStockAtLocation(receiveInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stocks.p1).toBe(7);
    expect(productRepo.batchUpdateStock).toHaveBeenCalledTimes(1);
  });

  it('[PO receive] updates location quantity once', async () => {
    const { inventory, levelRepo } = makeReceiveStack({ p1: 0 });
    const result = await inventory.receiveStockAtLocation(receiveInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(levelRepo.adjustCalls).toHaveLength(1);
    expect(levelRepo.adjustCalls[0]).toMatchObject({
      productId: 'p1',
      locationId: 'warehouse-a',
      delta: 5,
    });
    const level = await levelRepo.findByProductAndLocation('p1', 'warehouse-a');
    expect(level?.availableQty).toBe(5);
  });

  it('[duplicate PO receive] does not double-add stock', async () => {
    const { inventory, stocks, levelRepo, productRepo } = makeReceiveStack({ p1: 1 });
    const first = await inventory.receiveStockAtLocation(receiveInput);
    const second = await inventory.receiveStockAtLocation(receiveInput);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(stocks.p1).toBe(6);
    expect(levelRepo.adjustCalls).toHaveLength(1);
    expect(productRepo.batchUpdateStock).toHaveBeenCalledTimes(1);
  });

  it('[catalog failure] prevents location mutation', async () => {
    const { inventory, stocks, levelRepo, productRepo } = makeReceiveStack({ p1: 0 });
    productRepo.batchUpdateStock.mockRejectedValueOnce(new Error('catalog write blocked'));

    const result = await inventory.receiveStockAtLocation(receiveInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(stocks.p1).toBe(0);
    expect(levelRepo.adjustCalls).toHaveLength(0);
  });

  it('[location failure] rolls back catalog and reports LOCATION_RECEIVE_FAILED', async () => {
    const { inventory, stocks, levelRepo } = makeReceiveStack({ p1: 3 });
    levelRepo.failOnCall = 1;

    const result = await inventory.receiveStockAtLocation(receiveInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('LOCATION_RECEIVE_FAILED');
    expect(result.retryable).toBe(true);
    expect(stocks.p1).toBe(3);
    expect(levelRepo.adjustCalls).toHaveLength(1);
    expect(levelRepo.adjustCalls[0].delta).toBe(5);
  });

  it('[ledger] records productId, locationId, and purchaseOrderId', async () => {
    const { inventory, ledgerRepo } = makeReceiveStack({ p1: 0 });
    const result = await inventory.receiveStockAtLocation(receiveInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const locationEntries = ledgerRepo.entries.filter(
      (entry) => entry.reason === 'location_receive' && entry.locationId === 'warehouse-a' && entry.delta !== 0,
    );
    const catalogEntries = ledgerRepo.entries.filter(
      (entry) => entry.reason === 'location_receive' && entry.delta !== 0 && !entry.locationId,
    );
    expect(locationEntries.length).toBeGreaterThan(0);
    expect(locationEntries.every((entry) => entry.productId === 'p1')).toBe(true);
    expect(locationEntries.every((entry) => entry.purchaseOrderId === 'po-1')).toBe(true);
    expect(catalogEntries.every((entry) => entry.purchaseOrderId === 'po-1')).toBe(true);
    expect(ledgerRepo.entries.some((entry) => entry.idempotencyKey.startsWith('receive:po-receive:po-1:session-1'))).toBe(true);
  });

  it('[seal] PurchaseOrderService does not call applyInventoryDeltas directly', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/core/PurchaseOrderService.ts'), 'utf8');
    expect(source).not.toMatch(/\.applyInventoryDeltas\(/);
    expect(source).toMatch(/receiveStockAtLocation\(/);
  });

  it('[seal] admin inventory routes use protocol actions only', () => {
    const batchRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/inventory/batch/route.ts'),
      'utf8',
    );
    const ledgerRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/inventory/ledger/route.ts'),
      'utf8',
    );
    expect(batchRoute).toMatch(/services\.inventory\.adjustInventory/);
    expect(batchRoute).not.toMatch(/batchUpdateStock|batchSetInventory/);
    expect(ledgerRoute).toMatch(/services\.inventory\.getProductLedger/);
  });

  it('[seal] admin inventory UI delegates to API protocol, not repo stock writes', () => {
    const client = fs.readFileSync(path.join(process.cwd(), 'src/ui/apiClientServices.ts'), 'utf8');
    const adminInventory = fs.readFileSync(path.join(process.cwd(), 'src/ui/pages/admin/AdminInventory.tsx'), 'utf8');
    expect(client).toMatch(/\/api\/admin\/inventory\/batch/);
    expect(adminInventory).toMatch(/batchUpdateInventory/);
    expect(adminInventory).not.toMatch(/batchUpdateStock|batchSetInventory/);
  });
});
