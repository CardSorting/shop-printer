import { requireAdminSession, jsonError, readJsonObject } from '@infrastructure/server/apiGuards';
import { ticketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { getInitialServices } from '@core/container';
import { parseTicketBatchUpdate } from '../parsers';

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const { ids, updates } = parseTicketBatchUpdate(await readJsonObject(request));
    
    await ticketRepository.batchUpdateTickets(ids, updates);

    // PRODUCTION HARDENING: Forensic Auditing
    const { auditService } = getInitialServices();
    await auditService.record({
      userId: session.id,
      userEmail: session.email,
      action: 'ticket_batch_updated',
      targetId: 'batch',
      details: { ids, updates }
    });

    return Response.json({ success: true, updatedCount: ids.length });
  } catch (err) {
    return jsonError(err, 'Failed to batch update tickets');
  }
}
