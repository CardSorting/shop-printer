import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseInventoryLocationUpdate } from '../parsers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await params;
    const services = await getServerServices();
    const location = await services.inventoryLocationRepo.findById(id);
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json(location);
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

    const existing = await services.inventoryLocationRepo.findById(id);
    if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

    const updates = parseInventoryLocationUpdate(body);
    if (existing.isDefault && updates.isActive === false) {
      throw new DomainError('Default inventory location cannot be deactivated.');
    }
    const location = await services.inventoryLocationRepo.update(id, updates);
    await services.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'inventory_location_updated',
      targetId: id,
      details: { updatedFields: Object.keys(updates) },
    });

    return NextResponse.json(location);
  } catch (error) {
    return jsonError(error, 'Failed to update inventory location', request);
  }
}
