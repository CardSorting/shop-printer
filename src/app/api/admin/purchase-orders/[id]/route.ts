/**
 * [LAYER: INFRASTRUCTURE]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
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

    if (action === 'submit') {
      const order = await services.purchaseOrderService.submitOrder(id, user.id, user.email);
      return NextResponse.json(order);
    }

    if (action === 'cancel') {
      const order = await services.purchaseOrderService.cancelOrder(id, user.id, user.email);
      return NextResponse.json(order);
    }

    if (action === 'close') {
      const order = await services.purchaseOrderService.closeOrder(parseClosePurchaseOrder(body, id), user.id, user.email);
      return NextResponse.json(order);
    }

    if (action === 'receive') {
      const result = await services.purchaseOrderService.receiveItems(parseReceiveItems(body, id, user.id), { id: user.id, email: user.email });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return jsonError(error, 'Failed to process purchase order action');
  }
}
