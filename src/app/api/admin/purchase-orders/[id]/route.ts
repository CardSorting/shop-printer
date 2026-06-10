/**
 * [LAYER: INFRASTRUCTURE]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { parseClosePurchaseOrder, parsePurchaseOrderAction, parseReceiveItems } from '../parsers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession(request);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const { searchParams } = new URL(request.url);
    const services = await getServerServices();
    if (searchParams.get('guided') === 'true') {
      return NextResponse.json(await services.purchaseOrderService.getGuidedPurchaseOrder(id));
    }
    const order = await services.purchaseOrderService.getPurchaseOrder(id);
    return NextResponse.json(order);
  } catch (error) {
    return jsonError(error, 'Failed to load purchase order');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminSession(request);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const body = await readJsonObject(request);
    const action = parsePurchaseOrderAction(body);
    const services = await getServerServices();
    const actor = toAdminActor(user);
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined;

    if (action === 'submit') {
      const result = await services.admin.submitPurchaseOrder({
        actor,
        purchaseOrderId: id,
        idempotencyKey,
      });
      if (!result.ok) return adminRouteResponse(result);
      return NextResponse.json(result.data.purchaseOrder);
    }

    if (action === 'cancel') {
      const result = await services.admin.cancelPurchaseOrder({
        actor,
        purchaseOrderId: id,
        reason: typeof body.reason === 'string' ? body.reason : '',
        idempotencyKey,
      });
      if (!result.ok) return adminRouteResponse(result);
      return NextResponse.json(result.data.purchaseOrder);
    }

    if (action === 'close') {
      const result = await services.admin.closePurchaseOrder({
        actor,
        close: parseClosePurchaseOrder(body, id),
        idempotencyKey,
      });
      if (!result.ok) return adminRouteResponse(result);
      return NextResponse.json(result.data.purchaseOrder);
    }

    if (action === 'receive') {
      const receive = parseReceiveItems(body, id, user.id);
      const result = await services.admin.receivePurchaseOrder({
        actor,
        receive,
        idempotencyKey: idempotencyKey ?? receive.idempotencyKey,
      });
      return adminRouteResponse(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return jsonError(error, 'Failed to process purchase order action');
  }
}
