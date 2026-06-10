import * as crypto from 'node:crypto';
import type { TicketMessage } from '@domain/models';
import type { TicketService } from './TicketService';

export class ConversationService {
  constructor(private tickets: TicketService) {}

  async addMessage(params: {
    ticketId: string;
    senderId: string;
    senderType: TicketMessage['senderType'];
    visibility: 'public' | 'internal';
    content: string;
    messageId?: string;
  }): Promise<TicketMessage> {
    const message: TicketMessage = {
      id: params.messageId ?? crypto.randomUUID(),
      ticketId: params.ticketId,
      senderId: params.senderId,
      senderType: params.senderType,
      visibility: params.visibility,
      content: params.content,
      createdAt: new Date(),
    };
    await this.tickets.addMessage(message);
    return message;
  }
}
