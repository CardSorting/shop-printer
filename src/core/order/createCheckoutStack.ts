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

/**
 * Single construction path for checkout orchestration.
 * Container and tests should use this instead of wiring OrderCheckoutService directly.
 */
export function createCheckoutStack(deps: CheckoutStackDeps): CheckoutFlowService {
  const backend = new OrderCheckoutService(
    deps.orderRepo,
    deps.productRepo,
    deps.cartRepo,
    deps.discountRepo,
    deps.payment,
    deps.audit,
    deps.locker,
    deps.shippingRepo,
  );
  return new CheckoutFlowService(backend, deps.orderRepo, deps.checkoutGateway);
}
