import { OrderService } from '../../core/OrderService';
import { createCheckoutStack } from '../../core/order/createCheckoutStack';
import type { CheckoutFlowService } from '../../core/order/CheckoutFlowService';
import type { CheckoutMutationBackend } from '../../core/order/checkoutMutationBackend';

export type OrderTestStackMocks = {
  orderRepo: any;
  productRepo: any;
  cartRepo: any;
  discountRepo: any;
  payment: any;
  audit: any;
  locker: any;
  shippingRepo?: any;
  checkoutGateway?: any;
};

export function createOrderTestStack(mocks: OrderTestStackMocks): {
  orderService: OrderService;
  checkout: CheckoutFlowService;
  mutations: CheckoutMutationBackend;
} {
  const { checkout, mutations } = createCheckoutStack({
    orderRepo: mocks.orderRepo,
    productRepo: mocks.productRepo,
    cartRepo: mocks.cartRepo,
    discountRepo: mocks.discountRepo,
    payment: mocks.payment,
    audit: mocks.audit,
    locker: mocks.locker,
    shippingRepo: mocks.shippingRepo,
    checkoutGateway: mocks.checkoutGateway,
  });
  const orderService = new OrderService(
    mocks.orderRepo,
    mocks.productRepo,
    mocks.discountRepo,
    mocks.audit,
    checkout,
    mocks.shippingRepo,
  );
  return { orderService, checkout, mutations };
}
