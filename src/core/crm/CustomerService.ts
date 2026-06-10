import type { JsonValue, User } from '@domain/models';
import type { AuthService } from '../AuthService';
import type { OrderQueryService } from '../OrderQueryService';
import type { ITicketRepository } from '@domain/repositories';

export class CustomerService {
  constructor(
    private authService: AuthService,
    private orderQueryService: OrderQueryService,
    private ticketRepo?: ITicketRepository,
  ) {}

  async listAllUsers(): Promise<User[]> {
    return this.authService.getAllUsers();
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.authService.getAllUsers();
    return users.find((user) => user.id === id) ?? null;
  }

  async getCustomerSummaries() {
    const users = await this.authService.getAllUsers();
    return this.orderQueryService.getCustomerSummaries(users);
  }

  async getCustomerProfile(customerId: string) {
    const user = await this.getUserById(customerId);
    if (!user) return null;
    const supportSummary = this.ticketRepo
      ? await this.ticketRepo.getCustomerSupportSummary(customerId)
      : undefined;
    return { ...user, supportSummary };
  }

  async updateCustomer(
    customerId: string,
    patch: { displayName?: string; notes?: string; metadata?: Record<string, JsonValue> },
    actor: { id: string; email: string },
  ): Promise<User> {
    return this.authService.updateUser(customerId, patch, actor);
  }

  async appendNote(customerId: string, note: string, actor: { id: string; email: string }): Promise<User> {
    const user = await this.getUserById(customerId);
    const existingNotes = user?.notes?.trim() ?? '';
    const stamped = `[${new Date().toISOString()}] ${actor.email}: ${note.trim()}`;
    const merged = existingNotes ? `${existingNotes}\n${stamped}` : stamped;
    return this.authService.updateUser(customerId, { notes: merged }, actor);
  }

  async applyTags(customerId: string, tags: string[], actor: { id: string; email: string }): Promise<string[]> {
    const user = await this.getUserById(customerId);
    const metadata = { ...(user?.metadata ?? {}) };
    const existing = Array.isArray(metadata.crmTags) ? (metadata.crmTags as string[]) : [];
    const normalized = [...new Set([...existing, ...tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean)])];
    await this.authService.updateUser(customerId, { metadata: { ...metadata, crmTags: normalized } }, actor);
    return normalized;
  }
}
