import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseInventoryLocationUpdate } from '../parsers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminSession(request);
    const { id } = await params;
    const services = await getServerServices();
    const result = await services.admin.getLocation({
      actor: toAdminActor(user),
      locationId: id,
    });
    return adminRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Failed to load inventory location', request);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminSession(request);
    const { id } = await params;
    const body = await readJsonObject(request);
    const services = await getServerServices();
    const result = await services.admin.updateLocation({
      actor: toAdminActor(user),
      locationId: id,
      patch: parseInventoryLocationUpdate(body),
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
    });
    return adminRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Failed to update inventory location', request);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminSession(request);
    const { id } = await params;
    const body = (await readJsonObject(request).catch(() => ({}))) as Record<string, any>;
    const services = await getServerServices();
    const result = await services.admin.archiveLocation({
      actor: toAdminActor(user),
      locationId: id,
      reason: typeof body.reason === 'string' ? body.reason : 'Location archived by admin',
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
    });
    return adminRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Failed to archive inventory location', request);
  }
}
