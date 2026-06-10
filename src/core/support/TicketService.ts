import * as crypto from 'node:crypto';
import type { ITicketRepository } from '@domain/repositories';
import type { SupportTicket, TicketMessage, TicketPriority, TicketStatus } from '@domain/models';
import { DomainError } from '@domain/errors';
import { normalizeTicketStatus } from './supportTypes';

export class TicketService {
  constructor(private ticketRepo: ITicketRepository) {}

  async list(options?: { status?: string; userId?: string; assigneeId?: string; limit?: number }) {
    return this.ticketRepo.getTickets(options);
  }

  async getById(id: string): Promise<SupportTicket | null> {
    return this.ticketRepo.getTicketById(id);
  }

  async getForCustomer(id: string, userId: string): Promise<SupportTicket | null> {
    return this.ticketRepo.getTicketForCustomer(id, userId);
  }

  async create(ticket: SupportTicket): Promise<void> {
    await this.ticketRepo.createTicket(ticket);
  }

  async updateProperties(id: string, updates: Partial<SupportTicket>): Promise<void> {
    const normalized = { ...updates };
    if (updates.status) {
      const status = normalizeTicketStatus(updates.status);
      if (!status) throw new DomainError('Ticket status is invalid.');
      normalized.status = status;
    }
    await this.ticketRepo.updateTicketProperties(id, normalized);
  }

  async updateStatus(id: string, status: TicketStatus): Promise<void> {
    const normalized = normalizeTicketStatus(status);
    if (!normalized) throw new DomainError('Ticket status is invalid.');
    await this.ticketRepo.updateTicketStatus(id, normalized);
  }

  async updatePriority(id: string, priority: TicketPriority): Promise<void> {
    await this.ticketRepo.updateTicketPriority(id, priority);
  }

  async batchUpdate(ids: string[], updates: Partial<SupportTicket>): Promise<void> {
    await this.ticketRepo.batchUpdateTickets(ids, updates);
  }

  async addMessage(message: TicketMessage): Promise<void> {
    await this.ticketRepo.addMessage(message);
  }

  buildTicket(params: {
    userId: string;
    customerEmail: string;
    customerName?: string;
    subject: string;
    orderId?: string;
    productId?: string;
    type?: SupportTicket['type'];
    priority?: TicketPriority;
    tags?: string[];
    status?: TicketStatus;
    initialMessage?: {
      senderId: string;
      senderType: SupportTicket['messages'][number]['senderType'];
      visibility: 'public' | 'internal';
      content: string;
    };
  }): SupportTicket {
    const id = crypto.randomUUID();
    const now = new Date();
    const messages = params.initialMessage
      ? [{
          id: crypto.randomUUID(),
          ticketId: id,
          senderId: params.initialMessage.senderId,
          senderType: params.initialMessage.senderType,
          visibility: params.initialMessage.visibility,
          content: params.initialMessage.content,
          createdAt: now,
        }]
      : [];

    return {
      id,
      userId: params.userId,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      orderId: params.orderId,
      productId: params.productId,
      subject: params.subject,
      status: params.status ?? 'new',
      priority: params.priority ?? 'medium',
      type: params.type ?? 'question',
      tags: params.tags,
      messages,
      createdAt: now,
      updatedAt: now,
    };
  }
}
