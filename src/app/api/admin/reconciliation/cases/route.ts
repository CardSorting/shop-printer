import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
import { jsonError, parseBoundedLimit, requireAdminSession, readJsonObject } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const services = await getServerServices();

    const limit = parseBoundedLimit(searchParams.get('limit'));
    const readModel = await services.orderService.getReconciliationCasesReadModel({ limit });

    return NextResponse.json(readModel);
  } catch (error) {
    return jsonError(error, 'Failed to fetch reconciliation cases read model', request);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdminSession(request);
    const body = await readJsonObject(request);

    const caseId = body.caseId as string;
    const action = body.action as any;
    const reason = body.reason as string;

    if (!caseId || !action || !reason) {
      return NextResponse.json({ error: 'Missing required fields: caseId, action, reason' }, { status: 400 });
    }

    const services = await getServerServices();
    const actor = { id: adminUser.id, email: adminUser.email };

    const result = await services.checkout.handleReconciliationOperatorAction({
      caseId,
      action,
      reason,
      actor,
    });

    if (!result.ok) {
      return checkoutRouteResponse(result);
    }

    return NextResponse.json({
      success: true,
      message: 'Operator action applied successfully',
      duplicate: result.duplicate ?? false,
      applied: result.data.applied,
    });
  } catch (error) {
    return jsonError(error, 'Failed to apply reconciliation operator action', request);
  }
}
