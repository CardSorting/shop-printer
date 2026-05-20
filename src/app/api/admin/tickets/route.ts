import { NextResponse } from 'next/server';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseTicketListOptions } from './parsers';

export async function GET(req: Request) {
  try {
    await requireAdminSession(req);
    const { searchParams } = new URL(req.url);
    
    const tickets = await ticketRepository.getTickets(parseTicketListOptions(searchParams));
    return NextResponse.json(tickets);
  } catch (err: any) {
    return jsonError(err, 'Failed to fetch tickets');
  }
}
