import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await params;
    const data = await readJsonObject(request);
    const services = await getServerServices();
    const result = await services.support.updateMacro({
      id,
      patch: {
        ...(data.name !== undefined ? { name: requireString(data.name, 'name') } : {}),
        ...(data.content !== undefined ? { content: requireString(data.content, 'content') } : {}),
        ...(data.category !== undefined ? { category: requireString(data.category, 'category') } : {}),
        ...(data.slug !== undefined ? { slug: typeof data.slug === 'string' ? data.slug.trim() : undefined } : {}),
      },
    });
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to update support macro');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await params;
    const services = await getServerServices();
    const result = await services.support.deleteMacro({ id });
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to delete support macro');
  }
}
