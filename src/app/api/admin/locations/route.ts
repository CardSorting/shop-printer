/**
 * [LAYER: INFRASTRUCTURE]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseInventoryLocation } from './parsers';

export async function GET(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const services = await getServerServices();
    const result = await services.admin.listLocations({ actor: toAdminActor(user) });
    return adminRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Failed to load inventory locations', request);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const body = await readJsonObject(request);
    const services = await getServerServices();
    const result = await services.admin.createLocation({
      actor: toAdminActor(user),
      location: parseInventoryLocation(body),
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
    });
    if (!result.ok) {
      return adminRouteResponse(result);
    }
    return NextResponse.json(result.data, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create inventory location', request);
  }
}
