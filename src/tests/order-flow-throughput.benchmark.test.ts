import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CartService } from '@core/CartService';
import { OrderService } from '@core/OrderService';
import type { Address, Cart, CheckoutAttempt, Order, Product } from '@domain/models';

vi.mock('@utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@infrastructure/firebase/bridge', () => ({
  getUnifiedDb: vi.fn(() => ({})),
  runTransaction: vi.fn(async (_db: any, fn: (transaction: any) => Promise<any>) => {
    const transaction = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    return fn(transaction);
  }),
}));

type BenchmarkRow = {
  scenario: string;
  totalOperations: number;
  concurrency: number;
  durationMs: number;
  throughputPerSecond: number;
  successCount: number;
  failureCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
};

const BENCHMARK_ENABLED = process.env.ORDER_FLOW_BENCHMARK === '1';
const RESULT_PATH = path.resolve(process.cwd(), '.wiki/architecture/order-flow-throughput-results.json');
const address: Address = {
  street: '123 Benchmark St',
  city: 'Denver',
  state: 'CO',
  zip: '80202',
  country: 'US',
};

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

async function runMeasuredLoad(
  scenario: string,
  totalOperations: number,
  concurrency: number,
  task: (index: number) => Promise<void>
): Promise<BenchmarkRow> {
  const latencies: number[] = [];
  let nextIndex = 0;
  let successCount = 0;
  let failureCount = 0;
  const start = performance.now();

  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= totalOperations) return;

      const operationStart = performance.now();
      try {
        await task(index);
        successCount++;
      } catch {
        failureCount++;
      } finally {
        latencies.push(performance.now() - operationStart);
      }
    }
  }));

  const durationMs = performance.now() - start;
  return {
    scenario,
    totalOperations,
    concurrency,
    durationMs: Number(durationMs.toFixed(2)),
    throughputPerSecond: Number(((successCount / durationMs) * 1000).toFixed(2)),
    successCount,
    failureCount,
    p50Ms: Number(percentile(latencies, 50).toFixed(2)),
    p95Ms: Number(percentile(latencies, 95).toFixed(2)),
    p99Ms: Number(percentile(latencies, 99).toFixed(2)),
  };
}

class InMemoryCartRepository {
  readonly carts = new Map<string, Cart>();

  async getByUserId(userId: string): Promise<Cart | null> {
    return this.carts.get(userId) ?? null;
  }

  async save(cart: Cart): Promise<void> {
    this.carts.set(cart.userId, { ...cart, items: cart.items.map(item => ({ ...item })) });
  }

  async clear(userId: string): Promise<void> {
    this.carts.delete(userId);
  }

  seed(userId: string): void {
    this.carts.set(userId, {
      id: userId,
      userId,
      items: [{
        productId: 'product-benchmark',
        productHandle: 'benchmark-card',
        name: 'Benchmark Card',
        quantity: 1,
        priceSnapshot: 1000,
        imageUrl: '/benchmark-card.png',
        isDigital: false,
        weightGrams: 50,
      }],
      updatedAt: new Date(),
    });
  }
}

class InMemoryProductRepository {
  readonly product: Product = {
    id: 'product-benchmark',
    name: 'Benchmark Card',
    handle: 'benchmark-card',
    description: 'Benchmark product',
    price: 1000,
    stock: 1_000_000,
    category: 'benchmark',
    imageUrl: '/benchmark-card.png',
    media: [],
    tags: [],
    collections: [],
    isDigital: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  async getById(): Promise<Product> {
    return { ...this.product };
  }

  async batchUpdateStock(updates: Array<{ delta: number }>): Promise<void> {
    this.product.stock += updates.reduce((sum, update) => sum + update.delta, 0);
  }
}

class InMemoryOrderRepository {
  private nextOrderNumber = 1;
  readonly orders = new Map<string, Order>();
  readonly idempotency = new Map<string, string>();
  readonly paymentIntentMap = new Map<string, string>();
  readonly attempts = new Map<string, CheckoutAttempt>();

  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    if (order.idempotencyKey) {
      const existingId = this.idempotency.get(order.idempotencyKey);
      if (existingId) return this.orders.get(existingId)!;
    }

    const id = `bench-order-${this.nextOrderNumber++}`;
    const createdOrder = {
      ...order,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
    this.orders.set(id, createdOrder);
    if (order.idempotencyKey) this.idempotency.set(order.idempotencyKey, id);
    if (order.paymentTransactionId) this.paymentIntentMap.set(order.paymentTransactionId, id);
    return createdOrder;
  }

  async getById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async getByIdempotencyKey(key: string): Promise<Order | null> {
    const id = this.idempotency.get(key);
    return id ? this.orders.get(id) ?? null : null;
  }

  async getByPaymentTransactionId(id: string): Promise<Order | null> {
    const orderId = this.paymentIntentMap.get(id);
    return orderId ? this.orders.get(orderId) ?? null : null;
  }

  async getByPaymentTransactionIdTransactional(id: string): Promise<Order | null> {
    return this.getByPaymentTransactionId(id);
  }

  async getByUserId(): Promise<{ orders: Order[] }> {
    return { orders: [...this.orders.values()] };
  }

  async getAll(): Promise<{ orders: Order[] }> {
    return { orders: [...this.orders.values()] };
  }

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, { ...order, updatedAt: new Date() });
  }

  async updateStatus(id: string, status: Order['status']): Promise<void> {
    await this.patchOrder(id, { status });
  }

  async guardedUpdateStatus(
    id: string,
    _allowedCurrentStatuses: Order['status'][],
    status: Order['status']
  ): Promise<void> {
    await this.updateStatus(id, status);
  }

  async transitionPaymentState(id: string, _allowed: any, paymentState: Order['paymentState']): Promise<void> {
    await this.patchOrder(id, { paymentState });
  }

  async transitionFulfillmentState(id: string, _allowed: any, fulfillmentState: Order['fulfillmentState']): Promise<void> {
    await this.patchOrder(id, { fulfillmentState });
  }

  async transitionReconciliationState(id: string, _allowed: any, reconciliationState: Order['reconciliationState']): Promise<void> {
    await this.patchOrder(id, { reconciliationState });
  }

  async updatePaymentTransactionId(id: string, paymentTransactionId: string): Promise<void> {
    await this.patchOrder(id, { paymentTransactionId });
    this.paymentIntentMap.set(paymentTransactionId, id);
  }

  async recordCheckoutAttempt(attempt: Omit<CheckoutAttempt, 'createdAt' | 'updatedAt'>): Promise<void> {
    this.attempts.set(attempt.id, {
      ...attempt,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CheckoutAttempt);
  }

  async updateCheckoutAttempt(idempotencyKey: string, updates: Partial<CheckoutAttempt>): Promise<void> {
    const existing = this.attempts.get(idempotencyKey);
    if (existing) {
      this.attempts.set(idempotencyKey, { ...existing, ...updates, updatedAt: new Date() });
    }
  }

  async transitionCheckoutAttemptPhase(params: {
    attemptId: string;
    nextPhase: CheckoutAttempt['currentPhase'];
    authoritySource: CheckoutAttempt['authoritySource'];
    waitingFor: CheckoutAttempt['waitingFor'];
    reason: string;
    orderId?: string | null;
    paymentIntentId?: string | null;
  }): Promise<void> {
    const existing = this.attempts.get(params.attemptId);
    if (!existing) return;
    this.attempts.set(params.attemptId, {
      ...existing,
      currentPhase: params.nextPhase,
      authoritySource: params.authoritySource,
      waitingFor: params.waitingFor,
      lastTransitionReason: params.reason,
      orderId: params.orderId ?? existing.orderId,
      paymentIntentId: params.paymentIntentId ?? existing.paymentIntentId,
      updatedAt: new Date(),
    });
  }

  async getCheckoutAttempt(idempotencyKey: string): Promise<CheckoutAttempt | null> {
    return this.attempts.get(idempotencyKey) ?? null;
  }

  async getLatestCheckoutAttemptForUser(userId: string): Promise<CheckoutAttempt | null> {
    return [...this.attempts.values()].reverse().find(attempt => attempt.userId === userId) ?? null;
  }

  async createOrUpdateReconciliationCase(): Promise<void> {}
  async getOpenReconciliationCases(): Promise<any[]> { return []; }
  async getReconciliationCase(): Promise<null> { return null; }
  async getStuckCheckoutStates(): Promise<any> {
    return {
      openReconciliationCases: [],
      pendingPaidOrders: [],
      reconcilingPaidOrders: [],
      paidCancelledOrdersMissingReview: [],
      stuckCheckoutAttempts: [],
    };
  }

  async addNote(): Promise<void> {}
  async updateFulfillment(): Promise<void> {}
  async updateRiskScore(id: string, riskScore: number): Promise<void> {
    await this.patchOrder(id, { riskScore });
  }
  async recordRefund(): Promise<void> {}
  async markForReconciliation(): Promise<void> {}
  async clearReconciliationFlag(): Promise<void> {}
  async updateMetadata(id: string, metadata: Record<string, any>): Promise<void> {
    const existing = this.orders.get(id);
    await this.patchOrder(id, { metadata: { ...(existing?.metadata ?? {}), ...metadata } });
  }
  async addFulfillmentEvent(id: string, event: any): Promise<void> {
    const existing = this.orders.get(id);
    await this.patchOrder(id, { fulfillmentEvents: [...(existing?.fulfillmentEvents ?? []), event] });
  }
  async update(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<Order> {
    await this.patchOrder(id, updates);
    return this.orders.get(id)!;
  }
  async getStats(): Promise<any> { return {}; }
  async getDashboardStats(): Promise<any> { return {}; }
  async getTopProducts(): Promise<any[]> { return []; }
  async hasUsedDiscount(): Promise<boolean> { return false; }
  async checkUserDiscountUsage(): Promise<boolean> { return false; }
  async recordUserDiscountUsage(): Promise<void> {}
  async removeUserDiscountUsage(): Promise<void> {}
  async markHeartbeat(): Promise<void> {}
  async getActiveViewers(): Promise<any[]> { return []; }
  async getLogisticsStats(): Promise<any> { return {}; }

  private async patchOrder(id: string, updates: Partial<Order>): Promise<void> {
    const existing = this.orders.get(id);
    if (!existing) throw new Error(`Order ${id} not found`);
    this.orders.set(id, { ...existing, ...updates, updatedAt: new Date() });
  }
}

class InMemoryLockProvider {
  private locks = new Set<string>();
  private nextToken = 1;

  async acquireLock(resourceId: string): Promise<{ success: boolean; fencingToken: number | null }> {
    if (this.locks.has(resourceId)) return { success: false, fencingToken: null };
    this.locks.add(resourceId);
    return { success: true, fencingToken: this.nextToken++ };
  }

  async releaseLock(resourceId: string): Promise<void> {
    this.locks.delete(resourceId);
  }
}

function createHarness() {
  const cartRepo = new InMemoryCartRepository();
  const productRepo = new InMemoryProductRepository();
  const orderRepo = new InMemoryOrderRepository();
  const audit = {
    record: vi.fn(async () => undefined),
    recordWithTransaction: vi.fn(async () => undefined),
  };
  const discountRepo = {
    getByCode: vi.fn(async () => null),
    incrementUsage: vi.fn(async () => undefined),
    decrementUsage: vi.fn(async () => undefined),
  };
  const payment = {
    processPayment: vi.fn(async ({ orderId }: { orderId: string }) => ({
      success: true,
      transactionId: `pi_${orderId}`,
    })),
    refundPayment: vi.fn(async () => ({ success: true })),
  };
  const locker = new InMemoryLockProvider();

  return {
    cartRepo,
    productRepo,
    orderRepo,
    cartService: new CartService(cartRepo as any, productRepo as any),
    orderService: new OrderService(
      orderRepo as any,
      productRepo as any,
      cartRepo as any,
      discountRepo as any,
      payment as any,
      audit as any,
      locker as any
    ),
  };
}

describe.runIf(BENCHMARK_ENABLED)('order flow throughput benchmark', () => {
  it('measures concurrent cart, checkout, and full order flow throughput', async () => {
    const rows: BenchmarkRow[] = [];

    for (const concurrency of [25, 50, 100, 200]) {
      const harness = createHarness();
      rows.push(await runMeasuredLoad('cart_add_to_cart', 2_000, concurrency, async index => {
        await harness.cartService.addToCart(`cart-user-${concurrency}-${index}`, 'product-benchmark', 1);
      }));
    }

    for (const concurrency of [25, 50, 100, 200]) {
      const harness = createHarness();
      rows.push(await runMeasuredLoad('checkout_reservation_only', 1_000, concurrency, async index => {
        const userId = `checkout-user-${concurrency}-${index}`;
        harness.cartRepo.seed(userId);
        await harness.orderService.initiateCheckout(
          userId,
          address,
          `${userId}@example.test`,
          'Benchmark User',
          undefined,
          `checkout:${concurrency}:${index}`
        );
      }));
    }

    for (const concurrency of [25, 50, 100]) {
      const harness = createHarness();
      rows.push(await runMeasuredLoad('full_order_payment_finalize', 500, concurrency, async index => {
        const userId = `order-user-${concurrency}-${index}`;
        harness.cartRepo.seed(userId);
        await harness.orderService.initiateCheckout(
          userId,
          address,
          `${userId}@example.test`,
          'Benchmark User',
          undefined,
          `order:${concurrency}:${index}`,
          `pm_${concurrency}_${index}`
        );
      }));
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      node: process.version,
      runner: 'vitest/jsdom with mocked Firebase transaction bridge and in-memory repositories',
      rows,
    };

    mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
    writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

    expect(rows.every(row => row.failureCount === 0)).toBe(true);
    expect(rows.every(row => row.throughputPerSecond > 0)).toBe(true);
  }, 60_000);
});
