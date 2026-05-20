/**
 * [LAYER: INFRASTRUCTURE]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession, readJsonObject } from '@infrastructure/server/apiGuards';
import { parsePurchaseOrderCreate, parsePurchaseOrderListOptions, parseSupplierMetricsQuery } from './parsers';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const overview = searchParams.get('overview') === 'true';
    const workspace = searchParams.get('workspace') === 'true';

    const services = await getServerServices();

    if (workspace) {
      return NextResponse.json(await services.purchaseOrderService.getPurchaseOrderWorkspace());
    }

    if (overview) {
      return NextResponse.json(await services.purchaseOrderService.getPurchaseOrderOverview());
    }

    const supplierMetrics = parseSupplierMetricsQuery(searchParams);
    if (supplierMetrics) {
      return NextResponse.json(await services.purchaseOrderService.getSupplierMetrics(supplierMetrics));
    }

    return NextResponse.json(
      await services.purchaseOrderService.listPurchaseOrders(parsePurchaseOrderListOptions(searchParams))
    );
  } catch (error) {
    return jsonError(error, 'Failed to load purchase orders');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const body = parsePurchaseOrderCreate(await readJsonObject(request), user);
    const services = await getServerServices();
    const order = await services.purchaseOrderService.createPurchaseOrder(body);
    return Response.json(order, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create purchase order');
  }
}
