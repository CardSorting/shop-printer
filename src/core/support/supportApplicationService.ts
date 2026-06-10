import type { SupportMacro, SupportTicket } from '@domain/models';
import type { SupportResult } from './supportResult';
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
  TicketMessageResult,
  TicketOrderLinkResult,
  TicketResult,
  UpdateTicketInput,
} from './supportTypes';

export interface SupportApplicationService {
  listTickets(input: ListTicketsInput): Promise<SupportResult<SupportTicket[]>>;
  getTicket(input: GetTicketInput): Promise<SupportResult<SupportTicket>>;
  getTicketHealthMetrics(): Promise<SupportResult<{ slaCompliance: number; unassignedRate: number; totalActive: number }>>;
  getCustomerSupportSummary(userId: string): Promise<SupportResult<{ totalTickets: number; resolvedCount: number; totalSpend: number; recentOrders: unknown[] }>>;
  getMacros(): Promise<SupportResult<SupportMacro[]>>;

  createTicket(input: CreateTicketInput): Promise<SupportResult<TicketResult>>;
  updateTicket(input: UpdateTicketInput): Promise<SupportResult<TicketResult>>;
  assignTicket(input: AssignTicketInput): Promise<SupportResult<TicketResult>>;
  closeTicket(input: CloseTicketInput): Promise<SupportResult<TicketResult>>;
  reopenTicket(input: ReopenTicketInput): Promise<SupportResult<TicketResult>>;
  addTicketMessage(input: AddTicketMessageInput): Promise<SupportResult<TicketMessageResult>>;
  linkTicketToOrder(input: LinkTicketToOrderInput): Promise<SupportResult<TicketOrderLinkResult>>;
  batchUpdateTickets(input: BatchUpdateTicketsInput): Promise<SupportResult<{ updatedCount: number }>>;
  markHeartbeat(input: { ticketId: string; userId: string; userName: string }): Promise<SupportResult<{ viewers: Array<{ id?: string; name?: string }> }>>;
  addMacro(input: { name: string; content: string; category: string; slug?: string }): Promise<SupportResult<{ success: true }>>;
  updateMacro(input: { id: string; patch: Partial<{ name: string; content: string; category: string; slug: string }> }): Promise<SupportResult<{ success: true }>>;
  deleteMacro(input: { id: string }): Promise<SupportResult<{ success: true }>>;
}
