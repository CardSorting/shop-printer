import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireSessionUser, requireString } from '@infrastructure/server/apiGuards';
import { StripeService } from '@infrastructure/services/StripeService';
import { logger } from '@utils/logger';

/**
 * [LAYER: INTERFACE]
 * Success-Page Verification Route (Speed-of-Light UI Feedback)
 */
export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const paymentIntentId = requireString(searchParams.get('payment_intent'), 'payment_intent');

    const services = await getServerServices();
    const stripeService = new StripeService();
    const pi = await stripeService.getPaymentIntent(paymentIntentId);

    const result = await services.checkout.verifyPaymentFromClient(user.id, paymentIntentId, pi);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Checkout verification failed', error);
    return jsonError(error, 'Verification failed');
  }
}
