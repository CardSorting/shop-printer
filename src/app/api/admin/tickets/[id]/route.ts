import { NextResponse } from 'next/server';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession(req);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const ticket = await ticketRepository.getTicketById(id);
    if (!ticket) throw new DomainError(`Ticket not found: ${id}`);
    return NextResponse.json(ticket);
  } catch (err: any) {
    return jsonError(err, 'Failed to fetch ticket');
  }
}
