import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminSession(request);
    const { id: rawId } = await params;
    const orderId = requireString(rawId, 'id');
    const services = await getServerServices();

    const orderResult = await services.admin.getOrder({
      actor: toAdminActor(user),
      orderId,
    });
    if (!orderResult.ok) {
      return adminRouteResponse(orderResult);
    }

    const timeline = await services.commerceTimeline.getOrderTimeline(orderId);
    return NextResponse.json({
      orderId,
      correlationId: `order:${orderId}`,
      entries: timeline,
    });
  } catch (error) {
    return jsonError(error, 'Failed to load order timeline');
  }
}
