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
import { OrderCheckoutService } from './OrderCheckoutService';

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
};

export type CheckoutStack = {
  checkout: CheckoutFlowService;
  mutations: CheckoutMutationBackend;
};

/**
 * Single construction path for checkout orchestration.
 * Container and tests should use this instead of wiring OrderCheckoutService directly.
 */
export function createCheckoutStack(deps: CheckoutStackDeps): CheckoutStack {
  const mutations = new OrderCheckoutService(
    deps.orderRepo,
    deps.productRepo,
    deps.cartRepo,
    deps.discountRepo,
    deps.payment,
    deps.audit,
    deps.locker,
    deps.shippingRepo,
  );
  const checkout = new CheckoutFlowService(mutations, deps.orderRepo, deps.checkoutGateway);
  return { checkout, mutations };
}
