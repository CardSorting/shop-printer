import { requireAdminSession, jsonError, readJsonObject, requireString } from '@infrastructure/server/apiGuards';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { parseTicketHeartbeat } from '../../../../tickets/parsers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id: rawTicketId } = await params;
    const ticketId = requireString(rawTicketId, 'id');
    const { userId, userName } = parseTicketHeartbeat(await readJsonObject(request));
    
    await ticketRepository.markHeartbeat(ticketId, userId, userName);
    const viewers = await ticketRepository.getActiveViewers(ticketId, userId);
    
    return Response.json({ viewers });
  } catch (err) {
    return jsonError(err);
  }
}
