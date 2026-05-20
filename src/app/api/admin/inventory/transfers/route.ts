import { getInitialServices } from '@core/container';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const services = getInitialServices();
    const transfers = await services.transferService.getAllTransfers();
    return NextResponse.json(transfers);
  } catch (err) {
    return jsonError(err, 'Failed to fetch transfers');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const body = await readJsonObject(request);
    const id = requireString(body.id, 'id');
    const action = requireString(body.action, 'action');
    if (action !== 'receive') throw new DomainError(`Unsupported transfer action: ${action}`);
    
    const services = getInitialServices();
    const transfer = await services.transferService.receiveTransfer(id, { id: user.id, email: user.email });
    
    return NextResponse.json(transfer);
  } catch (err) {
    return jsonError(err, 'Failed to process transfer');
  }
}
