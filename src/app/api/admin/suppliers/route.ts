import { jsonError, requireAdminSession, readJsonObject } from '@infrastructure/server/apiGuards';
import { getServerServices } from '@infrastructure/server/services';
import { parseSupplierDraft, parseSupplierListOptions } from '../catalogParsers';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const services = await getServerServices();
    
    const suppliers = await services.supplierService.list(parseSupplierListOptions(searchParams));
    
    return Response.json(suppliers);
  } catch (error) {
    return jsonError(error, 'Failed to list suppliers');
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const body = parseSupplierDraft(await readJsonObject(request));
    const services = await getServerServices();
    
    const supplier = await services.supplierService.create(body, {
      id: session.id,
      email: session.email
    });
    
    return Response.json(supplier);
  } catch (error) {
    return jsonError(error, 'Failed to create supplier');
  }
}
