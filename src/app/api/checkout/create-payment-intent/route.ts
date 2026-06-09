import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import {
    assertRateLimit,
    jsonError,
    readJsonObject,
    requireSessionUser,
    requireStepUpSessionUser,
    parseShippingAddress,
    optionalString,
    requireIdempotencyKey
} from '@infrastructure/server/apiGuards';
import { StripeService } from '@infrastructure/services/StripeService';
import { DomainError } from '@domain/errors';

/**
 * [LAYER: INTERFACE]
 * Production-Hardened Payment Intent Route with Forensic Rollback
 */
export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    await assertRateLimit(request, 'checkout_init', 5, 60000);
    await assertRateLimit(request, 'checkout_init_user', 3, 60000, user.id);

    const services = await getServerServices();
    const body = await readJsonObject(request);

    const shippingAddress = parseShippingAddress(body.shippingAddress);
    const discountCode = optionalString(body.discountCode, 'discountCode');
    const idempotencyKey = requireIdempotencyKey(body.idempotencyKey);

    const stripeService = new StripeService();
    const result = await services.checkout.startClientCheckout({
      userId: user.id,
      shippingAddress,
      idempotencyKey,
      stripe: stripeService,
      userEmail: user.email,
      userName: user.displayName,
      discountCode,
      requireHighValueStepUp: () => requireStepUpSessionUser(request, 5 * 60 * 1000),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      return jsonError(error, 'Checkout initiation failed');
    }
    return jsonError(error, 'Checkout initiation failed');
  }
}
