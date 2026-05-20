import { requireAdminSession, jsonError, readJsonObject, requireString } from '@infrastructure/server/apiGuards';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { getInitialServices } from '@core/container';
import { parseTicketStatusUpdate } from '../../parsers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession(req);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const status = parseTicketStatusUpdate(await readJsonObject(req));
    
    const oldTicket = await ticketRepository.getTicketById(id);
    await ticketRepository.updateTicketStatus(id, status);
    const updated = await ticketRepository.getTicketById(id);

    // PRODUCTION HARDENING: Forensic Auditing
    const { auditService } = getInitialServices();
    await auditService.record({
      userId: session.id,
      userEmail: session.email,
      action: 'ticket_status_changed',
      targetId: id,
      details: { from: oldTicket?.status, to: status }
    });

    return Response.json(updated);
  } catch (err) {
    return jsonError(err);
  }
}
