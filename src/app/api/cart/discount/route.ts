import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import {
  assertRateLimit,
  assertTrustedMutationOrigin,
  jsonError,
  readJsonObject,
  requireSessionUser,
} from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const user = await requireSessionUser();
    await assertRateLimit(request, 'cart:discount', 10, 60_000);
    const body = await readJsonObject(request);
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) throw new DomainError('Discount code is required.');
    const services = await getServerServices();
    return cartRouteResponse(await services.cart.applyDiscount({ userId: user.id, code }));
  } catch (error) {
    return jsonError(error, 'Failed to apply discount');
  }
}

export async function DELETE(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const user = await requireSessionUser();
    const services = await getServerServices();
    return cartRouteResponse(await services.cart.clearDiscount({ userId: user.id }));
  } catch (error) {
    return jsonError(error, 'Failed to clear discount');
  }
}
