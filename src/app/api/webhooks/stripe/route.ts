import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getServerServices } from '@infrastructure/server/services';
import { checkoutErrorResponse } from '@infrastructure/server/checkoutRouteAdapter';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature') ?? '';
  const services = await getServerServices();
  const result = await services.checkout.handleCheckoutWebhook({ rawBody: body, signature });

  if (!result.ok) {
    return checkoutErrorResponse(result);
  }

  const { httpStatus, received, duplicate, retry } = result.data;
  return NextResponse.json({ received, duplicate, retry }, { status: httpStatus });
}
