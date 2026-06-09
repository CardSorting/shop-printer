import * as crypto from 'node:crypto';
import type { ICheckoutGateway } from '@domain/repositories';
import type { Order } from '@domain/models';
import type { CheckoutMutationBackend } from './checkoutMutationBackend';
import type { CompleteWithPaymentMethodParams } from './checkoutTypes';

export function completeCheckoutWithPaymentMethod(params: {
  mutations: CheckoutMutationBackend;
  checkoutGateway?: ICheckoutGateway;
  input: CompleteWithPaymentMethodParams;
}): Promise<Order> {
  const { mutations, checkoutGateway, input } = params;

  if (checkoutGateway) {
    return checkoutGateway.finalizeCheckout({
      userId: input.userId,
      shippingAddress: input.shippingAddress,
      paymentMethodId: input.paymentMethodId,
      idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
      discountCode: input.discountCode,
    });
  }

  return mutations.runCheckoutReservation({
    userId: input.userId,
    shippingAddress: input.shippingAddress,
    userEmail: input.userEmail,
    userName: input.userName,
    discountCode: input.discountCode,
    idempotencyKey: input.idempotencyKey,
    paymentMethodId: input.paymentMethodId,
    fulfillmentMethod: input.fulfillmentMethod,
  });
}
