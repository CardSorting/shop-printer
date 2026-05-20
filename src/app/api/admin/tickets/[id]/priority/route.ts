import { requireAdminSession, jsonError, readJsonObject, requireString } from '@infrastructure/server/apiGuards';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { parseTicketPriorityUpdate } from '../../parsers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession(req);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const priority = parseTicketPriorityUpdate(await readJsonObject(req));
    await ticketRepository.updateTicketPriority(id, priority);
    const updated = await ticketRepository.getTicketById(id);
    return Response.json(updated);
  } catch (err) {
    return jsonError(err);
  }
}
