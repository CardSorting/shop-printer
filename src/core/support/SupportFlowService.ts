import * as crypto from 'node:crypto';
import type { ITicketRepository } from '@domain/repositories';
import type { OrderQueryService } from '../OrderQueryService';
import type { SupportApplicationService } from './supportApplicationService';
import type { ISupportEventLog } from './supportEventLog';
import { supportMutationKey } from './supportEventLog';
import type {
  AddTicketMessageInput,
  AssignTicketInput,
  BatchUpdateTicketsInput,
  CloseTicketInput,
  CreateTicketInput,
  GetTicketInput,
  LinkTicketToOrderInput,
  ListTicketsInput,
  ReopenTicketInput,
  UpdateTicketInput,
} from './supportTypes';
import { assertTicketTransition, normalizeTicketStatus } from './supportTypes';
import { ConversationService } from './ConversationService';
import { TicketService } from './TicketService';
import { supportErr, supportFromError, supportOk, supportTry } from './supportResult';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';
import { mapSupportEventToEnvelope } from '../commerce/commerceEventMappers';

type SupportFlowDeps = {
  ticketRepo: ITicketRepository;
  orderQueryService?: OrderQueryService;
  eventLog: ISupportEventLog;
  commerceEventBus?: ICommerceEventBus;
};

function requireActor(actor: { id?: string }) {
  if (!actor?.id?.trim()) {
    return supportErr('VALIDATION_FAILED', 'actor is required for support mutations.', false);
  }
  return null;
}

function requireIdempotencyKey(key?: string) {
  if (!key?.trim()) {
    return supportErr('VALIDATION_FAILED', 'idempotencyKey is required for support idempotency.', false);
  }
  return null;
}

function requireReason(reason: string | undefined, label = 'reason') {
  if (!reason?.trim()) {
    return supportErr('VALIDATION_FAILED', `${label} is required for this support mutation.`, false);
  }
  return null;
}

export class SupportFlowService implements SupportApplicationService {
  private tickets: TicketService;
  private conversations: ConversationService;

  constructor(
    private deps: SupportFlowDeps,
  ) {
    this.tickets = new TicketService(deps.ticketRepo);
    this.conversations = new ConversationService(this.tickets);
  }

  async listTickets(input: ListTicketsInput) {
    return supportTry(async () => {
      const status = input.status === 'all' ? undefined : input.status;
      return this.tickets.list({
        status,
        userId: input.userId,
        assigneeId: input.assigneeId,
        limit: input.limit,
      });
    });
  }

  async getTicket(input: GetTicketInput) {
    try {
      const ticket = input.userId
        ? await this.tickets.getForCustomer(input.ticketId, input.userId)
        : await this.tickets.getById(input.ticketId);
      if (!ticket) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);
      return supportOk(ticket);
    } catch (error) {
      return supportFromError(error);
    }
  }

  async getTicketHealthMetrics() {
    return supportTry(() => this.deps.ticketRepo.getTicketHealthMetrics());
  }

  async getCustomerSupportSummary(userId: string) {
    return supportTry(() => this.deps.ticketRepo.getCustomerSupportSummary(userId));
  }

  async getMacros() {
    return supportTry(() => this.deps.ticketRepo.getMacros());
  }

  async createTicket(input: CreateTicketInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    if (!input.subject?.trim() || !input.message?.trim()) {
      return supportErr('VALIDATION_FAILED', 'subject and message are required.', false);
    }
    if (!input.userId?.trim() || !input.customerEmail?.trim()) {
      return supportErr('VALIDATION_FAILED', 'userId and customerEmail are required.', false);
    }

    const idempotencyKey = supportMutationKey('ticket.create', input.userId, input.actor.id, input.idempotencyKey);
    const claim = await this.deps.eventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      const prior = await this.deps.eventLog.findByIdempotencyKey(idempotencyKey);
      if (prior?.ticketId) {
        const existing = await this.tickets.getById(prior.ticketId);
        if (existing) return supportOk(existing, true);
      }
      return supportErr('DOMAIN_ERROR', 'Duplicate ticket create request; idempotency key already consumed.', false);
    }

    try {
      const ticket = this.tickets.buildTicket({
        userId: input.userId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        subject: input.subject.trim(),
        orderId: input.orderId,
        productId: input.productId,
        type: input.type,
        priority: input.priority,
        tags: input.tags,
        status: 'new',
        initialMessage: {
          senderId: input.actor.id,
          senderType: input.source === 'customer' ? 'customer' : input.source === 'concierge' ? 'system' : 'agent',
          visibility: input.visibility ?? 'public',
          content: input.message.trim(),
        },
      });

      await this.tickets.create(ticket);
      await this.recordEvent({
        actorId: input.actor.id,
        source: input.source,
        action: 'ticket.created',
        ticketId: ticket.id,
        customerId: input.userId,
        orderId: input.orderId,
        idempotencyKey,
      });
      await this.deps.eventLog.markMutationCompleted(idempotencyKey);
      return supportOk(ticket);
    } catch (error) {
      return supportFromError(error);
    }
  }

  async updateTicket(input: UpdateTicketInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    if (!Object.keys(input.patch).length) {
      return supportErr('VALIDATION_FAILED', 'At least one ticket property is required.', false);
    }

    const idempotencyKey = supportMutationKey('ticket.update', input.ticketId, input.actor.id, input.idempotencyKey);
    return this.runIdempotentMutation({
      idempotencyKey,
      duplicateLoader: async () => this.tickets.getById(input.ticketId),
      run: async () => {
        const existing = await this.tickets.getById(input.ticketId);
        if (!existing) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        if (input.patch.status) {
          const normalized = normalizeTicketStatus(input.patch.status);
          if (!normalized) return supportErr('VALIDATION_FAILED', 'Ticket status is invalid.', false);
          const transitionError = assertTicketTransition(existing.status, normalized);
          if (transitionError) return supportErr('INVALID_TRANSITION', transitionError, false);
          input.patch.status = normalized;
        }

        await this.tickets.updateProperties(input.ticketId, input.patch);
        const updated = await this.tickets.getById(input.ticketId);
        if (!updated) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        await this.recordEvent({
          actorId: input.actor.id,
          source: input.source,
          action: 'ticket.updated',
          ticketId: input.ticketId,
          customerId: existing.userId,
          orderId: input.patch.orderId ?? existing.orderId,
          reason: input.reason,
          idempotencyKey,
        });
        return supportOk(updated);
      },
    });
  }

  async assignTicket(input: AssignTicketInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    if (!input.assigneeId?.trim() || !input.assigneeName?.trim()) {
      return supportErr('VALIDATION_FAILED', 'assigneeId and assigneeName are required.', false);
    }

    const idempotencyKey = supportMutationKey('ticket.assign', input.ticketId, input.actor.id, input.idempotencyKey);
    return this.runIdempotentMutation({
      idempotencyKey,
      duplicateLoader: async () => this.tickets.getById(input.ticketId),
      run: async () => {
        const existing = await this.tickets.getById(input.ticketId);
        if (!existing) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        await this.tickets.updateProperties(input.ticketId, {
          assigneeId: input.assigneeId,
          assigneeName: input.assigneeName,
          status: existing.status === 'new' ? 'open' : existing.status,
        });
        const updated = await this.tickets.getById(input.ticketId);
        if (!updated) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        await this.recordEvent({
          actorId: input.actor.id,
          source: input.source,
          action: 'ticket.assigned',
          ticketId: input.ticketId,
          customerId: existing.userId,
          reason: input.reason,
          idempotencyKey,
        });
        return supportOk(updated);
      },
    });
  }

  async closeTicket(input: CloseTicketInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;

    const idempotencyKey = supportMutationKey('ticket.close', input.ticketId, input.actor.id, input.idempotencyKey);
    return this.runIdempotentMutation({
      idempotencyKey,
      duplicateLoader: async () => this.tickets.getById(input.ticketId),
      run: async () => {
        const existing = await this.tickets.getById(input.ticketId);
        if (!existing) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        const transitionError = assertTicketTransition(existing.status, 'closed');
        if (transitionError) return supportErr('INVALID_TRANSITION', transitionError, false);

        await this.tickets.updateStatus(input.ticketId, 'closed');
        const updated = await this.tickets.getById(input.ticketId);
        if (!updated) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        await this.recordEvent({
          actorId: input.actor.id,
          source: input.source,
          action: 'ticket.closed',
          ticketId: input.ticketId,
          customerId: existing.userId,
          reason: input.reason,
          idempotencyKey,
        });
        return supportOk(updated);
      },
    });
  }

  async reopenTicket(input: ReopenTicketInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    const reasonError = requireReason(input.reason);
    if (reasonError) return reasonError;

    const idempotencyKey = supportMutationKey('ticket.reopen', input.ticketId, input.actor.id, input.idempotencyKey);
    return this.runIdempotentMutation({
      idempotencyKey,
      duplicateLoader: async () => this.tickets.getById(input.ticketId),
      run: async () => {
        const existing = await this.tickets.getById(input.ticketId);
        if (!existing) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        const transitionError = assertTicketTransition(existing.status, 'reopened');
        if (transitionError && existing.status !== 'closed') {
          return supportErr('INVALID_TRANSITION', transitionError, false);
        }

        await this.tickets.updateStatus(input.ticketId, 'reopened');
        const updated = await this.tickets.getById(input.ticketId);
        if (!updated) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        await this.recordEvent({
          actorId: input.actor.id,
          source: input.source,
          action: 'ticket.reopened',
          ticketId: input.ticketId,
          customerId: existing.userId,
          reason: input.reason,
          idempotencyKey,
        });
        return supportOk(updated);
      },
    });
  }

  async addTicketMessage(input: AddTicketMessageInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    if (!input.content?.trim()) {
      return supportErr('VALIDATION_FAILED', 'content is required.', false);
    }

    const idempotencyKey = supportMutationKey('ticket.message', input.ticketId, input.actor.id, input.idempotencyKey);
    const claim = await this.deps.eventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return supportOk({
        id: idempotencyKey,
        ticketId: input.ticketId,
        senderId: input.actor.id,
        senderType: input.senderType ?? (input.source === 'customer' ? 'customer' : 'agent'),
        visibility: input.visibility ?? 'public',
        content: input.content.trim(),
        createdAt: new Date(),
      }, true);
    }

    try {
      const ticket = await this.tickets.getById(input.ticketId);
      if (!ticket) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

      const message = await this.conversations.addMessage({
        ticketId: input.ticketId,
        senderId: input.actor.id,
        senderType: input.senderType ?? (input.source === 'customer' ? 'customer' : input.source === 'concierge' ? 'system' : 'agent'),
        visibility: input.visibility ?? 'public',
        content: input.content.trim(),
        messageId: idempotencyKey,
      });

      await this.recordEvent({
        actorId: input.actor.id,
        source: input.source,
        action: 'ticket.message_added',
        ticketId: input.ticketId,
        customerId: ticket.userId,
        idempotencyKey,
      });
      await this.deps.eventLog.markMutationCompleted(idempotencyKey);
      return supportOk(message);
    } catch (error) {
      return supportFromError(error);
    }
  }

  async linkTicketToOrder(input: LinkTicketToOrderInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    if (!input.orderId?.trim()) {
      return supportErr('VALIDATION_FAILED', 'orderId is required.', false);
    }

    const idempotencyKey = supportMutationKey('ticket.link_order', input.ticketId, input.actor.id, input.idempotencyKey);
    return this.runIdempotentMutation({
      idempotencyKey,
      duplicateData: { ticketId: input.ticketId, orderId: input.orderId },
      run: async () => {
        const existing = await this.tickets.getById(input.ticketId);
        if (!existing) return supportErr('NOT_FOUND', `Ticket not found: ${input.ticketId}`, false);

        if (this.deps.orderQueryService) {
          const order = await this.deps.orderQueryService.getOrder(input.orderId);
          if (!order) return supportErr('NOT_FOUND', `Order not found: ${input.orderId}`, false);
        }

        await this.tickets.updateProperties(input.ticketId, { orderId: input.orderId });
        await this.recordEvent({
          actorId: input.actor.id,
          source: input.source,
          action: 'ticket.linked_order',
          ticketId: input.ticketId,
          customerId: existing.userId,
          orderId: input.orderId,
          reason: input.reason,
          idempotencyKey,
        });
        return supportOk({ ticketId: input.ticketId, orderId: input.orderId });
      },
    });
  }

  async markHeartbeat(input: { ticketId: string; userId: string; userName: string }) {
    return supportTry(async () => {
      await this.deps.ticketRepo.markHeartbeat(input.ticketId, input.userId, input.userName);
      const viewers = await this.deps.ticketRepo.getActiveViewers(input.ticketId, input.userId);
      return { viewers };
    });
  }

  async addMacro(input: { name: string; content: string; category: string; slug?: string }) {
    return supportTry(async () => {
      await this.deps.ticketRepo.addMacro(input);
      return { success: true as const };
    });
  }

  async updateMacro(input: { id: string; patch: Partial<{ name: string; content: string; category: string; slug: string }> }) {
    return supportTry(async () => {
      await this.deps.ticketRepo.updateMacro(input.id, input.patch);
      return { success: true as const };
    });
  }

  async deleteMacro(input: { id: string }) {
    return supportTry(async () => {
      await this.deps.ticketRepo.deleteMacro(input.id);
      return { success: true as const };
    });
  }

  async batchUpdateTickets(input: BatchUpdateTicketsInput) {
    const actorError = requireActor(input.actor);
    if (actorError) return actorError;
    const keyError = requireIdempotencyKey(input.idempotencyKey);
    if (keyError) return keyError;
    if (!input.ticketIds.length) {
      return supportErr('VALIDATION_FAILED', 'At least one ticket id is required.', false);
    }

    const idempotencyKey = supportMutationKey(
      'ticket.batch_update',
      input.ticketIds.join(','),
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      idempotencyKey,
      duplicateData: { updatedCount: input.ticketIds.length },
      run: async () => {
        if (input.patch.status) {
          const normalized = normalizeTicketStatus(input.patch.status);
          if (!normalized) return supportErr('VALIDATION_FAILED', 'Ticket status is invalid.', false);
          input.patch.status = normalized;
        }
        await this.tickets.batchUpdate(input.ticketIds, input.patch);
        await this.recordEvent({
          actorId: input.actor.id,
          source: input.source,
          action: 'ticket.updated',
          reason: input.reason,
          idempotencyKey,
        });
        return supportOk({ updatedCount: input.ticketIds.length });
      },
    });
  }

  private async runIdempotentMutation<T>(params: {
    idempotencyKey: string;
    duplicateLoader?: () => Promise<T | null>;
    duplicateData?: T;
    run: () => Promise<ReturnType<typeof supportOk<T>> | ReturnType<typeof supportErr>>;
  }) {
    const claim = await this.deps.eventLog.claimMutation(params.idempotencyKey);
    if (claim === 'completed') {
      if (params.duplicateLoader) {
        const existing = await params.duplicateLoader();
        if (existing) return supportOk(existing as T, true);
      }
      if (params.duplicateData !== undefined) return supportOk(params.duplicateData, true);
    }

    const result = await params.run();
    if (!result.ok) return result;
    await this.deps.eventLog.markMutationCompleted(params.idempotencyKey);
    return result;
  }

  private async recordEvent(params: {
    actorId: string;
    source: CreateTicketInput['source'];
    action: import('./supportEventLog').SupportEventAction;
    ticketId?: string;
    customerId?: string;
    orderId?: string;
    reason?: string;
    idempotencyKey: string;
  }) {
    const event = {
      id: crypto.randomUUID(),
      actorId: params.actorId,
      source: params.source,
      action: params.action,
      ticketId: params.ticketId,
      customerId: params.customerId,
      orderId: params.orderId,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    await this.deps.eventLog.recordEvent(event);
    if (this.deps.commerceEventBus) {
      await this.deps.commerceEventBus.publish(mapSupportEventToEnvelope(event));
    }
  }
}
