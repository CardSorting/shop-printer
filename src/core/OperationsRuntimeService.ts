/**
 * [LAYER: CORE]
 * Business operations compiler runtime.
 */
import type { OperationalActor, OperationalIntentType, OperationalPlan, OperationalPlanStatus, OperationalStateSnapshot } from '@domain/ops/types';
import { buildDefaultDesiredState, OPERATIONAL_INTENT_CARDS } from '@domain/ops/intents';
import type { ProductService } from './ProductService';
import type { OrderQueryService } from './OrderQueryService';
import type { PurchaseOrderService } from './PurchaseOrderService';
import type { SettingsService } from './SettingsService';
import { AuditService } from './AuditService';
import { OperationalPlannerService } from './OperationalPlannerService';

export class OperationsRuntimeService {
  constructor(
    private orderQueryService: OrderQueryService,
    private productService: ProductService,
    private purchaseOrderService: PurchaseOrderService,
    private settingsService: SettingsService,
    private auditService: AuditService,
    private planner: OperationalPlannerService = new OperationalPlannerService(auditService)
  ) {}

  getIntentCards() {
    return OPERATIONAL_INTENT_CARDS;
  }

  async compilePlan(intentType: OperationalIntentType, actor: OperationalActor): Promise<OperationalPlan> {
    const intent = {
      id: crypto.randomUUID(),
      source: 'intent_card' as const,
      desiredState: buildDefaultDesiredState(intentType),
      actor,
      createdAt: new Date(),
    };

    const snapshot = await this.captureState();
    const plan = this.planner.compile(intent, snapshot);

    await this.auditService.record({
      userId: actor.userId,
      userEmail: actor.email,
      action: 'ops_plan_generated',
      targetId: plan.id,
      details: {
        intentType,
        status: plan.status,
        operationCount: plan.proposedOperations.length,
        approvalCount: plan.approvalsRequired.length,
      },
    });

    return plan;
  }

  /**
   * EXECUTION ENGINE: Performs the real business logic for a plan's operations.
   */
  async executePlan(plan: OperationalPlan, actor: OperationalActor): Promise<OperationalPlan> {
    const executedOperations = [...plan.proposedOperations];
    
    for (let i = 0; i < executedOperations.length; i++) {
      const op = executedOperations[i];
      if (op.status !== 'proposed' && op.status !== 'approved') continue;
      if (op.requiresApproval && op.status !== 'approved') continue;

      try {
        await this.executeTool(op.tool, op.input, actor);
        executedOperations[i] = { ...op, status: 'executed' };
      } catch (error: any) {
        executedOperations[i] = { ...op, status: 'failed', error: error.message };
      }
    }

    const executedCount = executedOperations.filter(op => op.status === 'executed').length;
    const failedCount = executedOperations.filter(op => op.status === 'failed').length;
    const terminalCount = executedCount + failedCount;
    const nextStatus: OperationalPlanStatus = terminalCount === executedOperations.length
      ? failedCount === 0
        ? 'executed'
        : executedCount === 0
          ? 'failed'
          : 'partially_executed'
      : 'executing';

    const updatedPlan = {
      ...plan,
      proposedOperations: executedOperations,
      status: nextStatus,
      executedAt: new Date(),
    };

    await this.auditService.record({
      userId: actor.userId,
      userEmail: actor.email,
      action: 'ops_plan_executed',
      targetId: plan.id,
      details: {
        status: updatedPlan.status,
        totalOperations: executedOperations.length,
        executedCount,
        failedCount,
      }
    });

    return updatedPlan;
  }

  private async executeTool(toolId: string, input: any, actor: OperationalActor) {
    switch (toolId) {
      case 'product.batch_update_inventory':
        return this.productService.batchUpdateInventory(this.parseInventoryUpdates(input), {
          id: actor.userId,
          email: actor.email,
        });

      case 'purchase_order.draft':
        return this.purchaseOrderService.createPurchaseOrder({
          supplier: this.parseSupplier(input),
          referenceNumber: `OPS-${Date.now().toString().slice(-6)}`,
          items: this.parseReorderProducts(input).map((p) => ({
            productId: p.productId,
            orderedQty: p.suggestedQty,
            unitCost: p.unitCost,
          })),
          adminUserId: actor.userId,
          adminUserEmail: actor.email,
        });

      case 'discount.draft': {
        const discountProductIds = await this.selectDiscountProductIds(input);
        if (discountProductIds.length === 0) {
          throw new Error('No active, in-stock, margin-known products are eligible for this discount draft.');
        }
        return this.settingsService.createDiscountDraft({
          code: `WEEKEND-${Date.now().toString().slice(-4)}`,
          type: 'percentage',
          value: this.parsePercent(input.percentOff),
          status: 'scheduled',
          isAutomatic: false,
          selectionType: 'specific_products',
          selectedProductIds: discountProductIds,
          selectedCollectionIds: [],
          minimumRequirementType: 'none',
          minimumAmount: null,
          minimumQuantity: null,
          eligibilityType: 'everyone',
          eligibleCustomerIds: [],
          eligibleCustomerSegments: [],
          usageLimit: null,
          oncePerCustomer: true,
          combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });
      }

      case 'product.update_listing_quality': {
        const productIds = this.parseProducts(input).map((p: any) => p.id);
        return this.productService.batchReverify(productIds);
      }

      case 'order.prioritize_fulfillment':
        return this.orderQueryService.prioritizeFulfillmentQueue();

      case 'order.add_internal_note':
        return this.orderQueryService.addInternalNotes(this.parseOrderIds(input), this.parseNote(input), {
          id: actor.userId,
          email: actor.email,
        });

      case 'storefront.draft_featured_collection':
        return this.settingsService.updateSetting('storefront_featured_collection_draft', {
          id: crypto.randomUUID(),
          status: 'draft',
          source: 'operations_runtime',
          maxItems: this.parsePositiveInteger(input.maxItems, 4),
          excludedProductIds: this.parseStringArray(input.excludeProductIds),
          createdAt: new Date().toISOString(),
          reason: 'Stock-aware merchandising update suggested',
        }, {
          id: actor.userId,
          email: actor.email,
        });

      case 'settings.review_setup':
        return this.auditService.record({
          userId: actor.userId,
          userEmail: actor.email,
          action: 'setup_review_recorded',
          targetId: 'setup_progress',
          details: input,
        });

      default:
        throw new Error(`Unsupported operations tool: ${toolId}`);
    }
  }

  private parseProducts(input: any): any[] {
    if (!Array.isArray(input?.products)) throw new Error('Operation input must include a products array.');
    return input.products;
  }

  private parseReorderProducts(input: any): Array<{ productId: string; name?: string; suggestedQty: number; unitCost: number }> {
    if (!Array.isArray(input?.products)) throw new Error('Operation input must include a products array.');
    if (input.products.length === 0) throw new Error('Operation input must include at least one product.');
    return input.products.map((product: any) => {
      if (typeof product?.productId !== 'string' || !product.productId.trim()) throw new Error('Operation product is missing productId.');
      if (!Number.isInteger(product.suggestedQty) || product.suggestedQty <= 0) throw new Error(`Operation product ${product.productId} has an invalid suggested quantity.`);
      if (!Number.isInteger(product.unitCost) || product.unitCost <= 0) throw new Error(`Operation product ${product.productId} requires a real unit cost.`);
      return {
        productId: product.productId,
        name: typeof product.name === 'string' ? product.name : undefined,
        suggestedQty: product.suggestedQty,
        unitCost: product.unitCost,
      };
    });
  }

  private parseSupplier(input: any): string {
    if (typeof input?.supplier !== 'string' || !input.supplier.trim()) {
      throw new Error('Operation input must include a supplier for purchase order drafts.');
    }
    return input.supplier.trim();
  }

  private parseStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  }

  private parseOrderIds(input: any): string[] {
    const ids = this.parseStringArray(input?.orderIds);
    if (ids.length === 0) throw new Error('Operation input must include at least one order id.');
    return ids;
  }

  private parseNote(input: any): string {
    if (typeof input?.note !== 'string' || !input.note.trim()) throw new Error('Operation input must include a note.');
    return input.note;
  }

  private parsePercent(value: unknown): number {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error('Discount percent must be between 1 and 100.');
    return percent;
  }

  private parsePositiveInteger(value: unknown, fallback: number): number {
    const next = Number(value);
    return Number.isInteger(next) && next > 0 ? next : fallback;
  }

  private parseInventoryUpdates(input: any): { id: string; variantId?: string; stock: number }[] {
    if (!Array.isArray(input?.updates)) throw new Error('Operation input must include inventory updates.');
    return input.updates.map((update: any) => {
      if (typeof update?.id !== 'string' || !update.id.trim()) throw new Error('Inventory update id is required.');
      const stock = Number(update.stock);
      if (!Number.isInteger(stock) || stock < 0) throw new Error(`Inventory stock for ${update.id} must be a non-negative integer.`);
      return {
        id: update.id,
        variantId: typeof update.variantId === 'string' ? update.variantId : undefined,
        stock,
      };
    });
  }

  private async selectDiscountProductIds(input: any): Promise<string[]> {
    const excluded = new Set(this.parseStringArray(input?.excludeProductIds));
    const { products } = await this.productService.getProducts({ status: 'active', limit: 100 });
    const maxItems = this.parsePositiveInteger(input?.maxItems, 24);
    return products
      .filter((product) => !excluded.has(product.id))
      .filter((product) => product.stock > Math.max(0, product.reorderPoint ?? 0))
      .filter((product) => input?.requiresMarginKnown ? typeof product.cost === 'number' && product.cost > 0 : true)
      .slice(0, maxItems)
      .map((product) => product.id);
  }

  private async captureState(): Promise<OperationalStateSnapshot> {
    const [dashboard, productManagement, inventory, purchaseOrders, setupProgress] = await Promise.all([
      this.orderQueryService.getAdminDashboardSummary(),
      this.productService.getProductManagementOverview(),
      this.productService.getInventoryOverview(),
      this.purchaseOrderService.getPurchaseOrderWorkspace(),
      this.settingsService.getSetupProgress(),
    ]);

    return {
      capturedAt: new Date(),
      dashboard: {
        productCount: dashboard.productCount,
        lowStockCount: dashboard.lowStockCount,
        outOfStockCount: dashboard.outOfStockCount,
        totalRevenue: dashboard.totalRevenue,
        averageOrderValue: dashboard.averageOrderValue,
        orderCountsByStatus: dashboard.orderCountsByStatus,
        fulfillmentCounts: dashboard.fulfillmentCounts,
        activeTasks: dashboard.activeTasks,
        attentionItems: dashboard.attentionItems,
        dailyRevenue: dashboard.dailyRevenue,
      },
      productManagement: {
        totalProducts: productManagement.totalProducts,
        setupIssueCounts: productManagement.setupIssueCounts,
        marginHealthCounts: productManagement.marginHealthCounts,
        lowStockCount: productManagement.lowStockCount,
        outOfStockCount: productManagement.outOfStockCount,
        averageMarginPercent: productManagement.averageMarginPercent,
        productsNeedingAttention: productManagement.productsNeedingAttention,
      },
      inventory: {
        totalProducts: inventory.totalProducts,
        totalUnits: inventory.totalUnits,
        inventoryValue: inventory.inventoryValue,
        healthCounts: inventory.healthCounts,
        products: inventory.products,
      },
      purchaseOrders: {
        countsByView: purchaseOrders.countsByView,
        metrics: purchaseOrders.metrics,
      },
      setupProgress,
    };
  }
}
