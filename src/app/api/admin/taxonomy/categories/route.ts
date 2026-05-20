import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession, readJsonObject } from '@infrastructure/server/apiGuards';
import { parseProductCategoryInput } from '../../catalogParsers';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const services = await getServerServices();
    const categories = await services.taxonomyService.getAllCategories();
    return Response.json(categories);
  } catch (error) {
    return jsonError(error, 'Failed to list categories');
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const body = parseProductCategoryInput(await readJsonObject(request));
    const services = await getServerServices();
    
    const category = await services.taxonomyService.saveCategory(body, {
      id: session.id,
      email: session.email
    });
    
    return Response.json(category);
  } catch (error) {
    return jsonError(error, 'Failed to save category');
  }
}
