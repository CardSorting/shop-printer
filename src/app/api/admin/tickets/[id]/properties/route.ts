import { requireAdminSession, jsonError, readJsonObject, requireString } from '@infrastructure/server/apiGuards';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { getInitialServices } from '@core/container';
import { parseTicketProperties } from '../../parsers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession(req);
    const properties = parseTicketProperties(await readJsonObject(req));
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    
    const oldTicket = await ticketRepository.getTicketById(id);
    await ticketRepository.updateTicketProperties(id, properties);
    const updatedTicket = await ticketRepository.getTicketById(id);
    
    // PRODUCTION HARDENING: Forensic Auditing
    const { auditService } = getInitialServices();
    await auditService.record({
      userId: session.id,
      userEmail: session.email,
      action: 'ticket_updated',
      targetId: id,
      details: { properties, previousTags: oldTicket?.tags }
    });

    return Response.json(updatedTicket);
  } catch (err) {
    return jsonError(err);
  }
}
