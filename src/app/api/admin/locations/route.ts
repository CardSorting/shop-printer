/**
 * [LAYER: INFRASTRUCTURE]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseInventoryLocation } from './parsers';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const services = await getServerServices();
    const locations = await services.inventoryLocationRepo.findAll();
    return NextResponse.json(locations);
  } catch (error) {
    return jsonError(error, 'Failed to load inventory locations', request);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const body = await readJsonObject(request);
    const services = await getServerServices();
    const location = await services.inventoryLocationRepo.save(parseInventoryLocation(body));
    await services.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'inventory_location_saved',
      targetId: location.id,
      details: { name: location.name, type: location.type },
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create inventory location', request);
  }
}
