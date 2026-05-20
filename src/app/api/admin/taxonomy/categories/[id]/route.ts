/**
 * [LAYER: INFRASTRUCTURE]
 * API Route: /api/admin/taxonomy/categories/[id]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const session = await requireAdminSession(request);
    const services = await getServerServices();
    
    await services.taxonomyService.deleteCategory(id, {
      id: session.id,
      email: session.email
    });
    
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return jsonError(error, 'Failed to delete category');
  }
}
