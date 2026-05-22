import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from './OrderService';
import { CartEmptyError, OrderNotFoundError } from '@domain/errors';

// Mock the bridge
vi.mock('@infrastructure/firebase/bridge', () => ({
  runTransaction: vi.fn((db, fn) => fn({
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  })),
  getUnifiedDb: vi.fn(() => ({})),
}));

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepo: any;
  let mockProductRepo: any;
  let mockCartRepo: any;
  let mockDiscountRepo: any;
  let mockPayment: any;
  let mockAudit: any;
  let mockLocker: any;

  beforeEach(() => {
    mockOrderRepo = {
      create: vi.fn(),
      save: vi.fn(),
      getById: vi.fn(),
      getByPaymentTransactionId: vi.fn(),
      getByPaymentTransactionIdTransactional: vi.fn(),
      updateStatus: vi.fn(),
      guardedUpdateStatus: vi.fn().mockImplementation(async (id, _allowed, status, _reason, transaction) => {
        return mockOrderRepo.updateStatus(id, status, transaction);
      }),
      transitionPaymentState: vi.fn().mockResolvedValue(undefined),
      transitionFulfillmentState: vi.fn().mockResolvedValue(undefined),
      transitionReconciliationState: vi.fn().mockResolvedValue(undefined),
      updateRiskScore: vi.fn(),
      updateMetadata: vi.fn(),
      addFulfillmentEvent: vi.fn(),
      addNote: vi.fn(),
      updateFulfillment: vi.fn(),
      recordCheckoutAttempt: vi.fn(),
      updateCheckoutAttempt: vi.fn(),
      transitionCheckoutAttemptPhase: vi.fn().mockResolvedValue(undefined),
      createOrUpdateReconciliationCase: vi.fn(),
    };
    mockProductRepo = {
      getById: vi.fn().mockResolvedValue({ id: 'p1', price: 1000, stock: 10 }),
      batchUpdateStock: vi.fn(),
    };
    mockCartRepo = {
      getByUserId: vi.fn(),
      clear: vi.fn(),
    };
    mockDiscountRepo = {
      getByCode: vi.fn(),
      incrementUsage: vi.fn(),
    };
    mockPayment = {
      processPayment: vi.fn(),
    };
    mockAudit = {
      record: vi.fn(),
      recordWithTransaction: vi.fn(),
    };
    mockLocker = {
      acquireLock: vi.fn().mockResolvedValue(true),
      releaseLock: vi.fn(),
    };

    orderService = new OrderService(
      mockOrderRepo,
      mockProductRepo,
      mockCartRepo,
      mockDiscountRepo,
      mockPayment,
      mockAudit,
      mockLocker,
      undefined, // checkoutGateway
      undefined // shippingRepo
    );
  });

  describe('initiateCheckout', () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };

    it('should create an order from a cart', async () => {
      mockCartRepo.getByUserId.mockResolvedValue({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, priceSnapshot: 1000, name: 'P1', imageUrl: '/p1.png' }]
      });

      mockOrderRepo.create.mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        total: 1000,
        status: 'pending'
      });

      const order = await orderService.initiateCheckout('u1', address as any);

      expect(order.userId).toBe('u1');
      expect(order.total).toBeGreaterThan(0);
      expect(mockProductRepo.batchUpdateStock).toHaveBeenCalledWith([{ id: 'p1', delta: -1 }], expect.anything());
      expect(mockOrderRepo.create).toHaveBeenCalledTimes(1);
      expect(mockOrderRepo.recordCheckoutAttempt).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        orderId: 'o1',
        cartId: 'u1',
        cartOwnerId: 'o1',
        state: 'reserved',
        paymentIntentId: null,
      }), expect.anything());
      expect(mockCartRepo.clear).toHaveBeenCalledWith('u1', expect.anything());
    });

    it('should throw if cart is empty', async () => {
      mockCartRepo.getByUserId.mockResolvedValue(null);
      await expect(orderService.initiateCheckout('u1', address as any)).rejects.toThrow(CartEmptyError);
    });
  });

  describe('finalizeOrderPayment', () => {
    it('should update status without double-deducting reserved stock', async () => {
      const mockOrder = {
        id: 'o1',
        userId: 'u1',
        status: 'pending',
        fulfillmentMethod: 'shipping',
        metadata: { inventoryReserved: true },
        items: [{ productId: 'p1', quantity: 2 }]
      };
      mockOrderRepo.getByPaymentTransactionIdTransactional.mockResolvedValue(mockOrder);

      const result = await orderService.finalizeOrderPayment('pi_123', { status: 'succeeded', charges: { data: [{ outcome: { risk_score: 10 } }] } });

      expect(result.status).toBe('processing');
      expect(mockProductRepo.batchUpdateStock).not.toHaveBeenCalled();
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o1', 'processing', expect.anything());
      expect(mockOrderRepo.updateMetadata).toHaveBeenCalledWith('o1', {
        inventoryReserved: true,
        inventoryReservationFinalized: true,
      }, expect.anything());
    });

    it('should return existing order if already finalized', async () => {
      const mockOrder = { id: 'o1', status: 'confirmed' };
      mockOrderRepo.getByPaymentTransactionIdTransactional.mockResolvedValue(mockOrder);

      const result = await orderService.finalizeOrderPayment('pi_123');
      expect(result.status).toBe('confirmed');
      expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('autoAssignShippingMethod', () => {
    it('should assign USPS for light packages', async () => {
      mockOrderRepo.getById.mockResolvedValue({
        items: [{ quantity: 1 }], // 0.5 lbs
        total: 1000
      });

      const result = await orderService.autoAssignShippingMethod('o1');
      expect(result.carrier).toBe('USPS');
    });

    it('should assign UPS for heavy packages', async () => {
      mockOrderRepo.getById.mockResolvedValue({
        items: [{ quantity: 30 }], // 15 lbs
        total: 1000
      });

      const result = await orderService.autoAssignShippingMethod('o1');
      expect(result.carrier).toBe('UPS');
    });
  });

  describe('shipping export hardening', () => {
    const shippableOrder = {
      id: 'ship-1',
      status: 'confirmed',
      fulfillmentMethod: 'shipping',
      reconciliationRequired: false,
      userId: 'u1',
      customerName: 'Customer',
      customerEmail: 'c@example.com',
      items: [{ productId: 'p1', name: 'Card', quantity: 1, unitPrice: 1000, fulfilledQty: 0 }],
      total: 1000,
      shippingAmount: 0,
      taxAmount: 0,
      shippingAddress: { street: '1 Main', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      paymentTransactionId: null,
      riskScore: 0,
      fulfillmentLocationId: null,
      fulfillments: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('fails shipping export when an order id is missing instead of silently dropping it', async () => {
      mockOrderRepo.getById.mockResolvedValueOnce(null);

      await expect(orderService.exportOrdersToPirateShipCsv(['missing-order']))
        .rejects.toThrow(OrderNotFoundError);
    });

    it('blocks shipping export for unpaid pending orders', async () => {
      mockOrderRepo.getById.mockResolvedValueOnce({ ...shippableOrder, status: 'pending' });

      await expect(orderService.exportOrdersToPirateShipCsv(['ship-1']))
        .rejects.toThrow('cannot be exported for shipping');
    });

    it('exports only validated shippable physical orders', async () => {
      mockOrderRepo.getById.mockResolvedValueOnce(shippableOrder);

      const csv = await orderService.exportOrdersToPirateShipCsv(['ship-1'], { length: '6', width: '4', height: '1' }, 0.1);

      expect(csv).toContain('Order ID,Recipient Name');
      expect(csv).toContain('ship-1');
      expect(csv).toContain('Card x1');
    });
  });

  describe('admin hardening', () => {
    it('does not mark an order refunded through a status-only state change', async () => {
      mockOrderRepo.getById.mockResolvedValue({
        id: 'o1',
        status: 'delivered',
        paymentState: 'paid',
        reconciliationRequired: false,
      });

      await expect(orderService.updateOrderStatus('o1', 'refunded', { id: 'admin', email: 'a@example.com' }))
        .rejects.toThrow('refund workflow');
      expect(mockOrderRepo.transitionPaymentState).not.toHaveBeenCalledWith(
        'o1',
        expect.anything(),
        'refunded',
        expect.anything(),
        expect.anything()
      );
      expect(mockOrderRepo.guardedUpdateStatus).not.toHaveBeenCalled();
    });

    it('persists tracking, derives carrier data, records an event, and advances fulfillment', async () => {
      mockOrderRepo.getById.mockResolvedValue({
        id: 'o1',
        status: 'processing',
        fulfillmentState: 'processing',
        fulfillmentMethod: 'shipping',
        reconciliationRequired: false,
        items: [],
        total: 1000,
        shippingAddress: { street: '1 Main', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      });

      await orderService.updateOrderFulfillment('o1', {
        trackingNumber: '1Z999AA10123456784',
      }, { id: 'admin', email: 'a@example.com' });

      expect(mockOrderRepo.updateFulfillment).toHaveBeenCalledWith('o1', expect.objectContaining({
        trackingNumber: '1Z999AA10123456784',
        shippingCarrier: 'UPS',
        trackingUrl: expect.stringContaining('ups.com'),
      }), expect.anything());
      expect(mockOrderRepo.addFulfillmentEvent).toHaveBeenCalledWith('o1', expect.objectContaining({
        type: 'in_transit',
        label: 'Tracking assigned',
      }), expect.anything());
      expect(mockOrderRepo.transitionFulfillmentState).toHaveBeenCalledWith(
        'o1',
        ['unfulfilled', 'processing', 'shipped'],
        'shipped',
        'admin_tracking_assigned',
        expect.anything()
      );
      expect(mockOrderRepo.guardedUpdateStatus).toHaveBeenCalledWith(
        'o1',
        ['processing'],
        'shipped',
        'admin_tracking_assigned',
        expect.anything()
      );
    });
  });
});
