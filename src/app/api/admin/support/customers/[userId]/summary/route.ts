import { NextResponse } from 'next/server';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdminSession(request);
    const { userId: rawUserId } = await params;
    const userId = requireString(rawUserId, 'userId');
    const summary = await ticketRepository.getCustomerSupportSummary(userId);
    return NextResponse.json(summary);
  } catch (err) {
    return jsonError(err, 'Failed to fetch customer summary');
  }
}
