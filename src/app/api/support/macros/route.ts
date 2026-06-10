import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { sanitizeHtml } from '@utils/sanitizer';

export async function GET(req: Request) {
  try {
    await requireAdminSession(req);
    const services = await getServerServices();
    const result = await services.support.getMacros();
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to load support macros');
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession(req);
    const data = await readJsonObject(req);
    const services = await getServerServices();
    const result = await services.support.addMacro({
      name: requireString(data.name, 'name'),
      content: await sanitizeHtml(requireString(data.content, 'content')),
      category: requireString(data.category, 'category'),
      slug: typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : undefined,
    });
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to save support macro');
  }
}
