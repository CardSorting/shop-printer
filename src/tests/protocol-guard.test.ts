import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const API_ROOT = path.join(process.cwd(), 'src/app/api');

function collectRouteSources(): Array<{ file: string; source: string }> {
  const files: Array<{ file: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== 'route.ts') continue;
      files.push({
        file: path.relative(process.cwd(), full),
        source: fs.readFileSync(full, 'utf8'),
      });
    }
  };
  walk(API_ROOT);
  return files;
}

const FORBIDDEN_IMPORT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'RefundService', pattern: /@core\/RefundService/ },
  { label: 'OrderService', pattern: /@core\/OrderService/ },
  { label: 'InventoryService', pattern: /@core\/InventoryService/ },
  { label: 'CheckoutMutationService', pattern: /@core\/order\/checkoutMutationService/ },
  { label: 'InventoryFlowService', pattern: /@core\/inventory\/InventoryFlowService/ },
  { label: 'InventoryMutationService', pattern: /@core\/inventory\/InventoryMutationService/ },
  {
    label: 'commerce domain Firestore repository',
    pattern: /repositories\/firestore\/Firestore(?:Order|Inventory|Refund|Cart|Ticket|Reservation|Commerce)/,
  },
];

const FORBIDDEN_MUTATION_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'services.refundService', pattern: /services\.refundService/ },
  { label: 'refundService.processRefund', pattern: /refundService\.processRefund/ },
  {
    label: 'orderService mutation',
    pattern: /orderService\.(updateOrderStatus|addOrderNote|updateShippingAddress|applyDiscountToOrder|swapOrderItem|upgradeShipping|setOrderHold|releaseOrderHold|updateOrderFulfillment|batchUpdateOrderStatus|resolveReconciliation)/,
  },
  {
    label: 'purchaseOrderService mutation',
    pattern: /purchaseOrderService\.(createPurchaseOrder|submitOrder|cancelOrder|closeOrder|receiveItems)/,
  },
  {
    label: 'inventory protocol bypass',
    pattern: /inventory\.(reserveInventory|confirmReservation|releaseReservation|adjustInventory|receiveStockAtLocation|applyInventoryDeltas)/,
  },
  { label: 'productRepo.batchUpdateStock', pattern: /productRepo\.batchUpdateStock/ },
];

describe('Protocol guard (commerce runtime seal)', () => {
  const routes = collectRouteSources();

  it('[imports] no route imports raw mutation services', () => {
    for (const { file, source } of routes) {
      for (const rule of FORBIDDEN_IMPORT_PATTERNS) {
        expect(source, `${file} must not import ${rule.label}`).not.toMatch(rule.pattern);
      }
    }
  });

  it('[repos] no route imports commerce-domain Firestore repositories', () => {
    for (const { file, source } of routes) {
      expect(source, `${file} must not import commerce Firestore repositories`).not.toMatch(
        /repositories\/firestore\/Firestore(?:Order|Inventory|Refund|Cart|Ticket|Reservation|Commerce|DigitalAccess)/,
      );
    }
  });

  it('[mutations] no route calls legacy services for commerce mutations', () => {
    for (const { file, source } of routes) {
      for (const rule of FORBIDDEN_MUTATION_PATTERNS) {
        expect(source, `${file} must not call ${rule.label}`).not.toMatch(rule.pattern);
      }
    }
  });

  it('[concierge] concierge tools use admin protocol for order mutations', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/concierge/chat/route.ts'), 'utf8');
    expect(source).toMatch(/auditService,\s*admin\s*\}\s*=\s*getInitialServices\(\)/);
    expect(source).toMatch(/admin\.(addOrderNote|updateOrderStatus|getAdminOrder)/);
    expect(source).not.toMatch(/orderService\.(updateOrderStatus|addOrderNote|updateShippingAddress|applyDiscountToOrder|swapOrderItem|upgradeShipping|setOrderHold|releaseOrderHold)/);
    expect(source).not.toMatch(/refundService\.processRefund/);
    expect(source).toMatch(/refunds\.createRefund/);
  });

  it('[purchase orders] PO mutations route through services.admin', () => {
    const createRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/purchase-orders/route.ts'), 'utf8');
    const actionRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/purchase-orders/[id]/route.ts'), 'utf8');
    expect(createRoute).toMatch(/services\.admin\.createPurchaseOrder/);
    expect(createRoute).not.toMatch(/purchaseOrderService\.createPurchaseOrder/);
    expect(actionRoute).toMatch(/services\.admin\.(submitPurchaseOrder|cancelPurchaseOrder|closePurchaseOrder|receivePurchaseOrder)/);
    expect(actionRoute).not.toMatch(/purchaseOrderService\.(submitOrder|cancelOrder|closeOrder|receiveItems)/);
  });

  it('[status boundary] ticket parsers normalize legacy support statuses', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/tickets/parsers.ts'), 'utf8');
    expect(source).toMatch(/pending:\s*'pending_customer'/);
    expect(source).toMatch(/on_hold:\s*'pending_internal'/);
    expect(source).toMatch(/solved:\s*'resolved'/);
  });
});
