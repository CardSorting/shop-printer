import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession, readJsonObject } from '@infrastructure/server/apiGuards';
import { parseCollectionDraft, parseCollectionListOptions } from '../catalogParsers';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const services = await getServerServices();
    
    const collections = await services.collectionService.list(parseCollectionListOptions(searchParams));
    
    return Response.json(collections);
  } catch (error) {
    return jsonError(error, 'Failed to list collections');
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const body = parseCollectionDraft(await readJsonObject(request));
    const services = await getServerServices();
    
    const collection = await services.collectionService.create(body, {
      id: session.id,
      email: session.email
    });
    
    return Response.json(collection);
  } catch (error) {
    return jsonError(error, 'Failed to create collection');
  }
}
