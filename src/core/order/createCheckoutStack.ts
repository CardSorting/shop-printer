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
import type { AuditService } from '../AuditService';
import { CheckoutFlowService } from './CheckoutFlowService';
import type { CheckoutMutationBackend } from './checkoutMutationBackend';
import { CheckoutMutationService } from './checkoutMutationService';

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
  cancelExpiredPendingOrder?: (orderId: string) => Promise<void>;
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
    cancelExpiredPendingOrder: deps.cancelExpiredPendingOrder,
  });
  return { checkout, mutations };
}
