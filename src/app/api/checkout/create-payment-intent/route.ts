import { getServerServices } from '@infrastructure/server/services';
import { checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
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

    const result = await services.checkout.createCheckoutSession({
      userId: user.id,
      shippingAddress,
      idempotencyKey,
      userEmail: user.email,
      userName: user.displayName,
      discountCode,
      requireHighValueStepUp: () => requireStepUpSessionUser(request, 5 * 60 * 1000),
    });

    return checkoutRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Checkout initiation failed');
  }
}
