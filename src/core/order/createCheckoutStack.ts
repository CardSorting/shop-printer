import type {
  ICartRepository,
  ICheckoutGateway,
  IDiscountRepository,
  ILockProvider,
  IOrderRepository,
  IPaymentProcessor,
  IProductRepository,
  IShippingRepository,
} from '@domain/repositories';
import type { StripeService } from '@infrastructure/services/StripeService';
import type { AuditService } from '../AuditService';
import { CheckoutFlowService } from './CheckoutFlowService';
import type { CheckoutMutationBackend } from './checkoutMutationBackend';
import { CheckoutMutationService } from './checkoutMutationService';
import type { ICheckoutEventLog } from './checkoutEventLog';
import type { ReconciliationOperatorAction } from './checkoutTypes';

export type CheckoutStackDeps = {
  orderRepo: IOrderRepository;
  productRepo: IProductRepository;
  cartRepo: ICartRepository;
  discountRepo: IDiscountRepository;
  payment: IPaymentProcessor;
  audit: AuditService;
  locker: ILockProvider;
  shippingRepo?: IShippingRepository;
  checkoutGateway?: ICheckoutGateway;
  stripe?: StripeService;
  eventLog?: ICheckoutEventLog;
  cancelExpiredPendingOrder?: (orderId: string) => Promise<void>;
  recordOperatorAction?: (input: {
    caseId: string;
    action: ReconciliationOperatorAction;
    reason: string;
    actor: { id: string; email: string };
  }) => Promise<void>;
};

export type CheckoutStack = {
  checkout: CheckoutFlowService;
  mutations: CheckoutMutationBackend;
};

/**
 * Single construction path for checkout orchestration.
 * Container and tests should use this instead of wiring CheckoutMutationService directly.
 */
export function createCheckoutStack(deps: CheckoutStackDeps): CheckoutStack {
  const mutations = new CheckoutMutationService(
    deps.orderRepo,
    deps.productRepo,
    deps.cartRepo,
    deps.discountRepo,
    deps.payment,
    deps.audit,
    deps.locker,
    deps.shippingRepo,
  );
  const checkout = new CheckoutFlowService(mutations, deps.orderRepo, {
    checkoutGateway: deps.checkoutGateway,
    stripe: deps.stripe,
    eventLog: deps.eventLog,
    cancelExpiredPendingOrder: deps.cancelExpiredPendingOrder,
    recordOperatorAction: deps.recordOperatorAction,
  });
  return { checkout, mutations };
}
