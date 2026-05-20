import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseOrderService } from './PurchaseOrderService';
import { InvalidPurchaseOrderError, CannotReceivePurchaseOrderError } from '@domain/errors';

// Mock the bridge
vi.mock('@infrastructure/firebase/bridge', () => ({
  runTransaction: vi.fn((db, fn) => fn({
    get: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ hash: 'test-hash' }),
    }),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  })),
  getUnifiedDb: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
}));

describe('PurchaseOrderService - receiving Hardening', () => {
  let service: PurchaseOrderService;
  let mockPORepo: any;
  let mockProductRepo: any;
  let mockInventoryRepo: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPORepo = {
      save: vi.fn((po) => Promise.resolve(po)),
      saveReceivingSession: vi.fn((session) => Promise.resolve(session)),
    };
    mockProductRepo = {
      getById: vi.fn().mockResolvedValue({ id: 'prod-1', sku: 'SHINY-1', name: 'Shiny Card' }),
      update: vi.fn(),
    };
    mockInventoryRepo = {
      adjustQuantity: vi.fn().mockResolvedValue({ productId: 'p1', availableQty: 10 }),
    };
    mockAudit = {
      record: vi.fn(),
      recordWithTransaction: vi.fn(),
    };

    service = new PurchaseOrderService(
      mockPORepo,
      mockProductRepo,
      mockInventoryRepo,
      mockAudit
    );
  });

  describe('receiveItems with over-receiving rules', () => {
    const actor = { id: 'admin-1', email: 'admin@example.com' };

    it('should successfully receive items within the ordered quantity', async () => {
      const order = {
        id: 'po-1',
        status: 'ordered',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Shiny Card',
            sku: 'SHINY-1',
            orderedQty: 10,
            receivedQty: 0,
            unitCost: 100,
          }
        ],
        totalCost: 1000,
      };

      mockPORepo.save = vi.fn().mockImplementation((po) => Promise.resolve(po));
      // Inject getter/repo behavior
      service.getPurchaseOrder = vi.fn().mockResolvedValue(order);

      const input = {
        purchaseOrderId: 'po-1',
        receivedBy: 'Inspector Gadget',
        items: [
          {
            purchaseOrderItemId: 'item-1',
            receivedQty: 5,
            condition: 'new' as const,
          }
        ],
      };

      const result = await service.receiveItems(input, actor);

      expect(result.purchaseOrder.items[0].receivedQty).toBe(5);
      expect(result.purchaseOrder.status).toBe('partially_received');
      expect(mockInventoryRepo.adjustQuantity).toHaveBeenCalledWith(
        'prod-1',
        'default',
        5,
        'Received from PO po-1',
        expect.anything()
      );
      expect(mockAudit.recordWithTransaction).toHaveBeenCalled();
    });

    it('should successfully receive up to 10% overage with discrepancy reason "overage"', async () => {
      const order = {
        id: 'po-1',
        status: 'ordered',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Shiny Card',
            sku: 'SHINY-1',
            orderedQty: 10,
            receivedQty: 0,
            unitCost: 100,
          }
        ],
        totalCost: 1000,
      };

      service.getPurchaseOrder = vi.fn().mockResolvedValue(order);

      const input = {
        purchaseOrderId: 'po-1',
        receivedBy: 'Inspector Gadget',
        items: [
          {
            purchaseOrderItemId: 'item-1',
            receivedQty: 11, // Exactly 10% overordered quantity
            condition: 'new' as const,
            discrepancyReason: 'overage' as const,
          }
        ],
      };

      const result = await service.receiveItems(input, actor);

      expect(result.purchaseOrder.items[0].receivedQty).toBe(11);
      expect(result.purchaseOrder.status).toBe('received');
      expect(mockAudit.recordWithTransaction).toHaveBeenCalled();
    });

    it('should throw InvalidPurchaseOrderError when receiving overage without discrepancy reason "overage"', async () => {
      const order = {
        id: 'po-1',
        status: 'ordered',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Shiny Card',
            sku: 'SHINY-1',
            orderedQty: 10,
            receivedQty: 0,
            unitCost: 100,
          }
        ],
        totalCost: 1000,
      };

      service.getPurchaseOrder = vi.fn().mockResolvedValue(order);

      const input = {
        purchaseOrderId: 'po-1',
        receivedBy: 'Inspector Gadget',
        items: [
          {
            purchaseOrderItemId: 'item-1',
            receivedQty: 11, // 10% overage
            condition: 'new' as const,
            // missing discrepancyReason or mismatching
            discrepancyReason: 'wrong_item' as const,
          }
        ],
      };

      await expect(service.receiveItems(input, actor)).rejects.toThrow(
        /Overage discrepancy reason is required when receiving more than ordered amount/
      );
    });

    it('should throw InvalidPurchaseOrderError when receiving more than 10% overage, even with discrepancy reason "overage"', async () => {
      const order = {
        id: 'po-1',
        status: 'ordered',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Shiny Card',
            sku: 'SHINY-1',
            orderedQty: 10,
            receivedQty: 0,
            unitCost: 100,
          }
        ],
        totalCost: 1000,
      };

      service.getPurchaseOrder = vi.fn().mockResolvedValue(order);

      const input = {
        purchaseOrderId: 'po-1',
        receivedBy: 'Inspector Gadget',
        items: [
          {
            purchaseOrderItemId: 'item-1',
            receivedQty: 12, // 20% overage (exceeds 10% limit)
            condition: 'new' as const,
            discrepancyReason: 'overage' as const,
          }
        ],
      };

      await expect(service.receiveItems(input, actor)).rejects.toThrow(
        /Cannot receive more than 10% over ordered amount/
      );
    });

    it('rejects duplicate received lines before inventory mutation', async () => {
      await expect(service.receiveItems({
        purchaseOrderId: 'po-1',
        receivedBy: 'admin-1',
        items: [
          { purchaseOrderItemId: 'item-1', receivedQty: 1, condition: 'new' },
          { purchaseOrderItemId: 'item-1', receivedQty: 1, condition: 'new' },
        ],
      }, actor)).rejects.toThrow('Duplicate received line item-1');

      expect(mockInventoryRepo.adjustQuantity).not.toHaveBeenCalled();
    });
  });

  describe('createPurchaseOrder validation', () => {
    it('rejects duplicate products before saving a draft', async () => {
      await expect(service.createPurchaseOrder({
        supplier: 'Acme',
        adminUserId: 'admin-1',
        adminUserEmail: 'admin@example.com',
        items: [
          { productId: 'prod-1', orderedQty: 1, unitCost: 100 },
          { productId: 'prod-1', orderedQty: 1, unitCost: 100 },
        ],
      })).rejects.toThrow('Duplicate product prod-1');

      expect(mockPORepo.save).not.toHaveBeenCalled();
    });
  });
});
