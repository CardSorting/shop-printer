/**
 * [LAYER: CORE]
 * Purchase Order & Receiving Orchestration Service
 */
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  ReceivingSession,
  ReceivedItem,
  InventoryLevel,
  ReceivingDiscrepancyReason,
  ReceivingLineDisposition,
  PurchaseOrderReceivingSummary,
  PurchaseOrderWorkflowStep,
  PurchaseOrderLineReceivingSummary,
  PurchaseOrderSavedView,
} from '@domain/models';
import type {
  IPurchaseOrderRepository,
  IProductRepository,
  IInventoryLevelRepository,
  IInventoryLocationRepository,
} from '@domain/repositories';
import {
  PurchaseOrderNotFoundError,
  InvalidPurchaseOrderError,
  CannotCancelPurchaseOrderError,
  CannotReceivePurchaseOrderError,
  ProductNotFoundError,
} from '@domain/errors';
import { purchaseOrderRules } from '@domain/rules';
import { AuditService } from './AuditService';
import { runTransaction, getUnifiedDb, doc } from '@infrastructure/firebase/bridge';
import { logger } from '@utils/logger';

export interface CreatePurchaseOrderInput {
  supplier: string;
  referenceNumber?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  expectedAt?: Date | string;
  items: Array<{
    productId: string;
    orderedQty: number;
    unitCost: number;
    notes?: string;
  }>;
  notes?: string;
  adminUserId: string;
  adminUserEmail: string;
}

export interface CreateDraftPurchaseOrderInput {
  supplier: string;
  referenceNumber: string;
  items: Array<{
    productId: string;
    sku: string;
    productName: string;
    orderedQty: number;
    unitCost: number;
    notes?: string;
  }>;
}

export interface ReceiveItemsInput {
  purchaseOrderId: string;
  receivedBy: string;
  idempotencyKey?: string;
  items: Array<{
    purchaseOrderItemId: string;
    receivedQty: number;
    damagedQty?: number;
    condition: 'new' | 'damaged' | 'defective';
    discrepancyReason?: ReceivingDiscrepancyReason;
    disposition?: ReceivingLineDisposition;
    notes?: string;
  }>;
  notes?: string;
  locationId?: string;
}

export interface ClosePurchaseOrderInput {
  id: string;
  discrepancyReason?: ReceivingDiscrepancyReason;
  notes?: string;
}

export interface GuidedPurchaseOrder {
  order: PurchaseOrder;
  summary: PurchaseOrderReceivingSummary;
  workflow: PurchaseOrderWorkflowStep[];
  lineSummaries: PurchaseOrderLineReceivingSummary[];
  receivingSessions: ReceivingSession[];
}

export interface PurchaseOrderWorkspaceOrder {
  order: PurchaseOrder;
  summary: PurchaseOrderReceivingSummary;
  workflow: PurchaseOrderWorkflowStep[];
  lineSummaries: PurchaseOrderLineReceivingSummary[];
  attentionRequired: boolean;
}

export interface PurchaseOrderWorkspace {
  countsByView: Record<PurchaseOrderSavedView, number>;
  metrics: {
    incomingUnits: number;
    openShipments: number;
    exceptionCount: number;
    overdueCount: number;
    receivingValue: number;
  };
  orders: PurchaseOrderWorkspaceOrder[];
  recentReceivingSessions: ReceivingSession[];
}

export class PurchaseOrderService {
  constructor(
    private purchaseOrderRepo: IPurchaseOrderRepository,
    private productRepo: IProductRepository,
    private inventoryLevelRepo: IInventoryLevelRepository,
    private auditService: AuditService
  ) {}


  // ─────────────────────────────────────────────
  // Purchase Order CRUD
  // ─────────────────────────────────────────────

  async createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    this.assertCreatePurchaseOrderInput(input);

    if (!input.supplier.trim()) {
      throw new InvalidPurchaseOrderError('Supplier name is required');
    }

    const items: PurchaseOrderItem[] = [];
    for (const inputItem of input.items) {
      if (inputItem.orderedQty <= 0) {
        throw new InvalidPurchaseOrderError(`Ordered quantity must be positive for ${inputItem.productId}`);
      }
      if (inputItem.unitCost < 0) {
        throw new InvalidPurchaseOrderError(`Unit cost cannot be negative for ${inputItem.productId}`);
      }

      const product = await this.productRepo.getById(inputItem.productId);
      if (!product) throw new ProductNotFoundError(inputItem.productId);

      items.push({
        id: crypto.randomUUID(),
        productId: inputItem.productId,
        sku: product.sku || inputItem.productId,
        productName: product.name,
        orderedQty: inputItem.orderedQty,
        receivedQty: 0,
        unitCost: inputItem.unitCost,
        totalCost: inputItem.orderedQty * inputItem.unitCost,
        notes: inputItem.notes,
      });
    }

    const order: PurchaseOrder = {
      id: '', // Will be set by repository
      supplier: input.supplier,
      referenceNumber: input.referenceNumber,
      shippingCarrier: input.shippingCarrier,
      trackingNumber: input.trackingNumber,
      expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
      status: 'draft',
      items,
      notes: input.notes,
      totalCost: purchaseOrderRules.calculateTotalCost(items),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.purchaseOrderRepo.save(order);

    await this.auditService.record({
      userId: input.adminUserId,
      userEmail: input.adminUserEmail,
      action: 'purchase_order.created',
      targetId: saved.id,
      details: { supplier: saved.supplier, itemCount: saved.items.length }
    });

    return saved;
  }

  /**
   * Draft creation for operational automation where product details were already resolved.
   */
  async createDraft(input: CreateDraftPurchaseOrderInput): Promise<PurchaseOrder> {
    if (!input.supplier.trim()) throw new InvalidPurchaseOrderError('Supplier name is required');
    if (!input.referenceNumber.trim()) throw new InvalidPurchaseOrderError('Reference number is required');
    if (!Array.isArray(input.items) || input.items.length === 0) throw new InvalidPurchaseOrderError('At least one item is required');
    if (input.items.length > 100) throw new InvalidPurchaseOrderError('Purchase orders are limited to 100 line items');
    const seen = new Set<string>();
    const items: PurchaseOrderItem[] = input.items.map(item => ({
      id: crypto.randomUUID(),
      productId: this.requireLineString(item.productId, 'productId'),
      sku: this.requireLineString(item.sku, 'sku'),
      productName: this.requireLineString(item.productName, 'productName'),
      orderedQty: this.requirePositiveWholeNumber(item.orderedQty, 'orderedQty'),
      receivedQty: 0,
      unitCost: this.requireNonNegativeWholeNumber(item.unitCost, 'unitCost'),
      totalCost: item.orderedQty * item.unitCost,
      notes: item.notes,
    }));
    for (const item of items) {
      if (seen.has(item.productId)) throw new InvalidPurchaseOrderError(`Duplicate product ${item.productId} in purchase order`);
      seen.add(item.productId);
    }

    const order: PurchaseOrder = {
      id: '',
      supplier: input.supplier,
      referenceNumber: input.referenceNumber,
      status: 'draft',
      items,
      totalCost: purchaseOrderRules.calculateTotalCost(items),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.purchaseOrderRepo.save(order);
  }


  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    this.assertId(id);
    const order = await this.purchaseOrderRepo.findById(id);
    if (!order) throw new PurchaseOrderNotFoundError(id);
    return order;
  }

  async getGuidedPurchaseOrder(id: string): Promise<GuidedPurchaseOrder> {
    const order = await this.getPurchaseOrder(id);
    const receivingSessions = this.purchaseOrderRepo.findReceivingSessions
      ? await this.purchaseOrderRepo.findReceivingSessions(id)
      : [];
    const baseSummary = purchaseOrderRules.calculateReceivingSummary(order);
    const damagedQty = receivingSessions.reduce(
      (sum, session) => sum + session.receivedItems.reduce((lineSum, item) => lineSum + (item.damagedQty ?? 0), 0),
      0
    );
    const discrepancyCount = receivingSessions.reduce(
      (sum, session) => sum + session.receivedItems.filter((item) => item.discrepancyReason).length,
      0
    );
    const stockableQty = receivingSessions.reduce(
      (sum, session) => sum + session.receivedItems.reduce((lineSum, item) => {
        if ((item.disposition ?? 'add_to_stock') !== 'add_to_stock') return lineSum;
        return lineSum + Math.max(0, item.receivedQty - (item.damagedQty ?? 0));
      }, 0),
      0
    );

    return {
      order,
      summary: {
        ...baseSummary,
        damagedQty,
        discrepancyCount,
        stockableQty,
      },
      workflow: purchaseOrderRules.buildWorkflowSteps(order),
      lineSummaries: purchaseOrderRules.calculateLineReceivingSummaries(order),
      receivingSessions,
    };
  }

  async getPurchaseOrderWorkspace(): Promise<PurchaseOrderWorkspace> {
    const orders = await this.purchaseOrderRepo.findAll({ limit: 100 });
    const views: PurchaseOrderSavedView[] = ['all', 'drafts', 'incoming', 'partially_received', 'ready_to_close', 'exceptions', 'closed'];
    const countsByView = views.reduce((acc, view) => {
      acc[view] = orders.filter((order) => purchaseOrderRules.matchesSavedView(order, view)).length;
      return acc;
    }, {} as Record<PurchaseOrderSavedView, number>);

    const workspaceOrders = orders.map((order) => {
      const lineSummaries = purchaseOrderRules.calculateLineReceivingSummaries(order);
      return {
        order,
        summary: purchaseOrderRules.calculateReceivingSummary(order),
        workflow: purchaseOrderRules.buildWorkflowSteps(order),
        lineSummaries,
        attentionRequired: lineSummaries.some((line) => line.attentionRequired),
      };
    });

    const metrics = workspaceOrders.reduce((acc, workspaceOrder) => {
      const { order, summary, attentionRequired } = workspaceOrder;
      if (purchaseOrderRules.canReceive(order)) {
        acc.openShipments += 1;
        acc.incomingUnits += summary.openQty;
        acc.receivingValue += order.items.reduce((sum, item) => sum + Math.max(0, item.orderedQty - item.receivedQty) * item.unitCost, 0);
      }
      if (attentionRequired) acc.exceptionCount += 1;
      if (summary.dueState === 'overdue') acc.overdueCount += 1;
      return acc;
    }, {
      incomingUnits: 0,
      openShipments: 0,
      exceptionCount: 0,
      overdueCount: 0,
      receivingValue: 0,
    });

    const recentReceivingSessions: ReceivingSession[] = [];
    if (this.purchaseOrderRepo.findReceivingSessions) {
      for (const order of orders.slice(0, 20)) {
        recentReceivingSessions.push(...await this.purchaseOrderRepo.findReceivingSessions(order.id));
      }
      recentReceivingSessions.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    }

    return {
      countsByView,
      metrics,
      orders: workspaceOrders,
      recentReceivingSessions: recentReceivingSessions.slice(0, 10),
    };
  }

  async listPurchaseOrders(options?: {
    status?: PurchaseOrderStatus;
    supplier?: string;
    limit?: number;
    offset?: number;
  }): Promise<PurchaseOrder[]> {
    return await this.purchaseOrderRepo.findAll(this.normalizeListOptions(options));
  }

  async countPurchaseOrders(status?: PurchaseOrderStatus): Promise<number> {
    if (status && !this.isPurchaseOrderStatus(status)) throw new InvalidPurchaseOrderError('Purchase order status is invalid');
    return await this.purchaseOrderRepo.count({ status });
  }

  // ─────────────────────────────────────────────
  // Workflow Actions
  // ─────────────────────────────────────────────

  async submitOrder(id: string, adminUserId: string, adminUserEmail: string): Promise<PurchaseOrder> {
    const order = await this.getPurchaseOrder(id);
    if (!purchaseOrderRules.canSubmit(order)) {
      throw new InvalidPurchaseOrderError('Cannot submit order in current status or with no items');
    }
    const updated = await this.purchaseOrderRepo.updateStatus(id, 'ordered');

    await this.auditService.record({
      userId: adminUserId,
      userEmail: adminUserEmail,
      action: 'purchase_order.submitted',
      targetId: id,
      details: { status: 'ordered' }
    });

    return updated;
  }


  async cancelOrder(id: string, adminUserId: string, adminUserEmail: string): Promise<PurchaseOrder> {
    const order = await this.getPurchaseOrder(id);
    if (!purchaseOrderRules.canCancel(order)) {
      throw new CannotCancelPurchaseOrderError(order.status);
    }
    const updated = await this.purchaseOrderRepo.updateStatus(id, 'cancelled');

    await this.auditService.record({
      userId: adminUserId,
      userEmail: adminUserEmail,
      action: 'purchase_order.cancelled',
      targetId: id,
      details: { status: 'cancelled' }
    });

    return updated;
  }


  async closeOrder(input: ClosePurchaseOrderInput, adminUserId: string, adminUserEmail: string): Promise<PurchaseOrder> {
    const order = await this.getPurchaseOrder(input.id);
    if (!purchaseOrderRules.canClose(order)) {
      throw new InvalidPurchaseOrderError('Only received or partially received purchase orders can be closed');
    }
    const summary = purchaseOrderRules.calculateReceivingSummary(order);
    if (summary.openQty > 0 && !purchaseOrderRules.isValidDiscrepancyReason(input.discrepancyReason)) {
      throw new InvalidPurchaseOrderError('Choose a reason before closing with missing items');
    }

    const notes = [order.notes, input.notes]
      .filter((value): value is string => Boolean(value?.trim()))
      .join('\n');

    const saved = await this.purchaseOrderRepo.save({
      ...order,
      status: 'closed',
      notes: notes || order.notes,
      updatedAt: new Date(),
    });

    await this.auditService.record({
      userId: adminUserId,
      userEmail: adminUserEmail,
      action: 'purchase_order.closed',
      targetId: input.id,
      details: { discrepancyReason: input.discrepancyReason, notes: input.notes }
    });

    return saved;
  }


  // ─────────────────────────────────────────────
  // Receiving Workflow
  // ─────────────────────────────────────────────

  async receiveItems(input: ReceiveItemsInput, actor: { id: string, email: string }): Promise<{
    purchaseOrder: PurchaseOrder;
    session: ReceivingSession;
    inventoryUpdates: InventoryLevel[];
  }> {
    this.assertReceiveItemsInput(input);

    if (input.idempotencyKey && this.purchaseOrderRepo.findReceivingSessionByIdempotencyKey) {
      const existingSession = await this.purchaseOrderRepo.findReceivingSessionByIdempotencyKey(
        input.purchaseOrderId,
        input.idempotencyKey
      );
      if (existingSession) {
        return {
          purchaseOrder: await this.getPurchaseOrder(input.purchaseOrderId),
          session: existingSession,
          inventoryUpdates: [],
        };
      }
    }

    const order = await this.getPurchaseOrder(input.purchaseOrderId);
    if (!purchaseOrderRules.canReceive(order)) {
      throw new CannotReceivePurchaseOrderError(order.status);
    }

    // Map purchase order items by ID for quick lookup
    const poItemsById = new Map(order.items.map((i) => [i.id, i]));

    const receivedItems: ReceivedItem[] = [];
    const poItemUpdates: Map<string, PurchaseOrderItem> = new Map();

    for (const inputItem of input.items) {
      const poItem = poItemsById.get(inputItem.purchaseOrderItemId);
      if (!poItem) {
        throw new InvalidPurchaseOrderError(`Invalid purchase order item: ${inputItem.purchaseOrderItemId}`);
      }

      const currentReceived = poItem.receivedQty;
      const currentSessionReceived = poItemUpdates.get(inputItem.purchaseOrderItemId)?.receivedQty ?? currentReceived;
      const openQty = Math.max(0, poItem.orderedQty - currentSessionReceived);
      const damagedQty = inputItem.damagedQty ?? (inputItem.condition === 'new' ? 0 : inputItem.receivedQty);
      const disposition = inputItem.disposition ?? (inputItem.condition === 'new' ? 'add_to_stock' : 'quarantine');

      const nextReceived = currentSessionReceived + inputItem.receivedQty;
      if (!purchaseOrderRules.validateReceiveQty(poItem.orderedQty, currentSessionReceived, inputItem.receivedQty)) {
        throw new InvalidPurchaseOrderError(
          `Cannot receive more than 10% over ordered amount for ${poItem.productName}`
        );
      }
      if (nextReceived > poItem.orderedQty && inputItem.discrepancyReason !== 'overage') {
        throw new InvalidPurchaseOrderError(
          `Overage discrepancy reason is required when receiving more than ordered amount for ${poItem.productName}`
        );
      }
      if (damagedQty < 0 || damagedQty > inputItem.receivedQty) {
        throw new InvalidPurchaseOrderError('Damaged quantity must be between zero and the quantity received');
      }
      if ((damagedQty > 0 || inputItem.condition !== 'new') && !purchaseOrderRules.isValidDiscrepancyReason(inputItem.discrepancyReason)) {
        throw new InvalidPurchaseOrderError(`Choose a discrepancy reason for ${poItem.productName}`);
      }

      receivedItems.push({
        id: crypto.randomUUID(),
        purchaseOrderItemId: inputItem.purchaseOrderItemId,
        productId: poItem.productId,
        sku: poItem.sku,
        expectedQty: openQty,
        receivedQty: inputItem.receivedQty,
        damagedQty,
        unitCost: poItem.unitCost,
        condition: inputItem.condition,
        discrepancyReason: inputItem.discrepancyReason,
        disposition,
        notes: inputItem.notes,
      });

      // Track new totals
      const newReceivedQty = currentSessionReceived + inputItem.receivedQty;
      poItemUpdates.set(inputItem.purchaseOrderItemId, {
        ...poItem,
        receivedQty: newReceivedQty,
      });
    }

    // Build updated items array preserving order
    const updatedItems = order.items.map((item) => {
      const updated = poItemUpdates.get(item.id);
      return updated ?? item;
    });

    // Determine new status
    const newStatus = purchaseOrderRules.calculateReceivedStatus(updatedItems);

    try {
      return await runTransaction(getUnifiedDb(), async (transaction: any) => {
        // 1. Update Product Costs (Atomic)
        for (const receivedItem of receivedItems) {
          if (receivedItem.condition === 'new' && receivedItem.receivedQty > 0) {
            const docRef = doc(getUnifiedDb(), 'products', receivedItem.productId);
            const docSnap = await transaction.get(docRef);
            if (docSnap.exists()) {
              const product = docSnap.data();
              if (product && (product.cost === undefined || product.cost === 0)) {
                await this.productRepo.update(receivedItem.productId, { cost: receivedItem.unitCost }, transaction);
              }
            }
          }
        }

        // 2. Update Inventory Levels (Atomic)
        const inventoryUpdates: InventoryLevel[] = [];
        const locationId = input.locationId || 'default';

        for (const receivedItem of receivedItems) {
          const stockableQty = (receivedItem.disposition ?? 'add_to_stock') === 'add_to_stock'
            ? Math.max(0, receivedItem.receivedQty - (receivedItem.damagedQty ?? 0))
            : 0;
          if (stockableQty > 0) {
            const level = await this.inventoryLevelRepo.adjustQuantity(
              receivedItem.productId,
              locationId,
              stockableQty,
              `Received from PO ${input.purchaseOrderId}`,
              transaction
            );
            inventoryUpdates.push(level);
          }
        }

        // 3. Update Purchase Order Status & Items (Atomic)
        const updatedOrder: PurchaseOrder = {
          ...order,
          items: updatedItems,
          status: newStatus,
          totalCost: purchaseOrderRules.calculateTotalCost(updatedItems),
          updatedAt: new Date(),
        };

        const savedOrder = await this.purchaseOrderRepo.save(updatedOrder, transaction);

        // 4. Create Receiving Session Record (Atomic)
        const session: ReceivingSession = {
          id: crypto.randomUUID(),
          purchaseOrderId: input.purchaseOrderId,
          status: 'completed',
          receivedItems,
          notes: input.notes,
          idempotencyKey: input.idempotencyKey,
          locationId: input.locationId,
          receivedAt: new Date(),
          completedAt: new Date(),
          receivedBy: input.receivedBy,
        };

        const savedSession = this.purchaseOrderRepo.saveReceivingSession
          ? await this.purchaseOrderRepo.saveReceivingSession(session, transaction)
          : session;

        // 5. Record Audit (Transactional)
        await this.auditService.recordWithTransaction(transaction, {
          userId: actor.id,
          userEmail: actor.email,
          action: 'purchase_order.items_received',
          targetId: input.purchaseOrderId,
          details: { 
            sessionId: session.id,
            itemCount: input.items.length,
            totalQty: input.items.reduce((s, i) => s + i.receivedQty, 0)
          }
        });

        return {
          purchaseOrder: savedOrder,
          session: savedSession,
          inventoryUpdates,
        };
      });
    } catch (err) {
      logger.error('Failed to receive items for purchase order', { id: input.purchaseOrderId, err });
      throw err;
    }
  }


  // ─────────────────────────────────────────────
  // Overview Dashboard
  // ─────────────────────────────────────────────

  async getPurchaseOrderOverview(): Promise<{
    totalOrders: number;
    draftCount: number;
    orderedCount: number;
    partiallyReceivedCount: number;
    receivedCount: number;
    closedCount: number;
    cancelledCount: number;
    needsReceivingCount: number;
    recentOrders: PurchaseOrder[];
  }> {
    const totalOrders = await this.purchaseOrderRepo.count();
    const draftCount = await this.purchaseOrderRepo.count({ status: 'draft' });
    const orderedCount = await this.purchaseOrderRepo.count({ status: 'ordered' });
    const partiallyReceivedCount = await this.purchaseOrderRepo.count({ status: 'partially_received' });
    const receivedCount = await this.purchaseOrderRepo.count({ status: 'received' });
    const closedCount = await this.purchaseOrderRepo.count({ status: 'closed' });
    const cancelledCount = await this.purchaseOrderRepo.count({ status: 'cancelled' });
    const recentOrders = await this.purchaseOrderRepo.findAll({ limit: 10 });

    return {
      totalOrders,
      draftCount,
      orderedCount,
      partiallyReceivedCount,
      receivedCount,
      closedCount,
      cancelledCount,
      needsReceivingCount: orderedCount + partiallyReceivedCount,
      recentOrders,
    };
  }

  async getSupplierMetrics(supplierName: string): Promise<{
    activeOrders: number;
    totalOrders: number;
    totalSpent: number;
    lastOrderAt?: Date;
  }> {
    const orders = await this.purchaseOrderRepo.findAll({ supplier: supplierName });
    
    const activeOrders = orders.filter(o => o.status === 'ordered' || o.status === 'partially_received').length;
    const totalSpent = orders.reduce((sum, o) => sum + o.totalCost, 0);
    const lastOrderAt = orders.length > 0 ? [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : undefined;

    return {
      activeOrders,
      totalOrders: orders.length,
      totalSpent,
      lastOrderAt,
    };
  }

  private assertCreatePurchaseOrderInput(input: CreatePurchaseOrderInput): void {
    if (!input || typeof input !== 'object') throw new InvalidPurchaseOrderError('Purchase order payload is required');
    if (typeof input.supplier !== 'string' || !input.supplier.trim()) throw new InvalidPurchaseOrderError('Supplier name is required');
    if (input.supplier.trim().length > 160) throw new InvalidPurchaseOrderError('Supplier name must be 160 characters or fewer');
    if (!Array.isArray(input.items) || input.items.length === 0) throw new InvalidPurchaseOrderError('At least one item is required');
    if (input.items.length > 100) throw new InvalidPurchaseOrderError('Purchase orders are limited to 100 line items');
    const seen = new Set<string>();
    for (const item of input.items) {
      this.requireLineString(item.productId, 'productId');
      this.requirePositiveWholeNumber(item.orderedQty, 'orderedQty');
      this.requireNonNegativeWholeNumber(item.unitCost, 'unitCost');
      if (seen.has(item.productId)) throw new InvalidPurchaseOrderError(`Duplicate product ${item.productId} in purchase order`);
      seen.add(item.productId);
    }
  }

  private assertReceiveItemsInput(input: ReceiveItemsInput): void {
    this.assertId(input.purchaseOrderId);
    if (typeof input.receivedBy !== 'string' || !input.receivedBy.trim()) throw new InvalidPurchaseOrderError('Receiver is required');
    if (!Array.isArray(input.items) || input.items.length === 0) throw new InvalidPurchaseOrderError('At least one received item is required');
    if (input.items.length > 100) throw new InvalidPurchaseOrderError('Receiving sessions are limited to 100 line items');
    const seen = new Set<string>();
    for (const item of input.items) {
      this.requireLineString(item.purchaseOrderItemId, 'purchaseOrderItemId');
      this.requirePositiveWholeNumber(item.receivedQty, 'receivedQty');
      if (item.damagedQty !== undefined) this.requireNonNegativeWholeNumber(item.damagedQty, 'damagedQty');
      if (!['new', 'damaged', 'defective'].includes(item.condition)) throw new InvalidPurchaseOrderError('Received item condition is invalid');
      if (item.discrepancyReason !== undefined && !purchaseOrderRules.isValidDiscrepancyReason(item.discrepancyReason)) {
        throw new InvalidPurchaseOrderError('Receiving discrepancy reason is invalid');
      }
      if (item.disposition !== undefined && !['add_to_stock', 'quarantine', 'return_to_supplier', 'write_off'].includes(item.disposition)) {
        throw new InvalidPurchaseOrderError('Receiving disposition is invalid');
      }
      if (seen.has(item.purchaseOrderItemId)) throw new InvalidPurchaseOrderError(`Duplicate received line ${item.purchaseOrderItemId}`);
      seen.add(item.purchaseOrderItemId);
    }
  }

  private normalizeListOptions(options?: {
    status?: PurchaseOrderStatus;
    supplier?: string;
    limit?: number;
    offset?: number;
  }): { status?: PurchaseOrderStatus; supplier?: string; limit?: number; offset?: number } | undefined {
    if (!options) return undefined;
    if (options.status && !this.isPurchaseOrderStatus(options.status)) throw new InvalidPurchaseOrderError('Purchase order status is invalid');
    const limit = options.limit === undefined ? undefined : this.requirePositiveWholeNumber(options.limit, 'limit');
    const offset = options.offset === undefined ? undefined : this.requireNonNegativeWholeNumber(options.offset, 'offset');
    return {
      status: options.status,
      supplier: options.supplier?.trim() || undefined,
      limit: limit === undefined ? undefined : Math.min(limit, 100),
      offset,
    };
  }

  private assertId(id: string): void {
    if (typeof id !== 'string' || !id.trim()) throw new InvalidPurchaseOrderError('Purchase order id is required');
  }

  private isPurchaseOrderStatus(value: string): value is PurchaseOrderStatus {
    return ['draft', 'ordered', 'partially_received', 'received', 'closed', 'cancelled'].includes(value);
  }

  private requireLineString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) throw new InvalidPurchaseOrderError(`${field} is required`);
    return value.trim();
  }

  private requirePositiveWholeNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) throw new InvalidPurchaseOrderError(`${field} must be a positive whole number`);
    return value;
  }

  private requireNonNegativeWholeNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new InvalidPurchaseOrderError(`${field} must be zero or greater`);
    return value;
  }
}
