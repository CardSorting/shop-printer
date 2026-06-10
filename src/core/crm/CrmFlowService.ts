import * as crypto from 'node:crypto';
import type { IAdminOperatorEventLog } from '../admin/adminOperatorEventLog';
import { adminMutationKey } from '../admin/adminOperatorEventLog';
import type { CrmApplicationService } from './crmApplicationService';
import type {
  AddCustomerNoteInput,
  GetCustomerInput,
  ListCustomersInput,
  MergeCustomersInput,
  TagCustomerInput,
  UpdateCustomerInput,
} from './crmApplicationService';
import { CustomerService } from './CustomerService';
import { crmErr, crmFromError, crmOk, crmTry } from './crmResult';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';
import { mapCrmEventToEnvelope } from '../commerce/commerceEventMappers';

type CrmFlowDeps = {
  customers: CustomerService;
  operatorEventLog: IAdminOperatorEventLog;
  commerceEventBus?: ICommerceEventBus;
};

function requireReason(reason: string | undefined, label = 'reason') {
  if (!reason?.trim()) {
    return crmErr('VALIDATION_FAILED', `${label} is required for this CRM mutation.`, false);
  }
  return null;
}

export class CrmFlowService implements CrmApplicationService {
  constructor(private deps: CrmFlowDeps) {}

  async listCustomers(input: ListCustomersInput) {
    return crmTry(() => this.deps.customers.getCustomerSummaries());
  }

  async getCustomer(input: GetCustomerInput) {
    try {
      const profile = await this.deps.customers.getCustomerProfile(input.customerId);
      if (!profile) return crmErr('NOT_FOUND', `Customer not found: ${input.customerId}`, false);
      return crmOk(profile);
    } catch (error) {
      return crmFromError(error);
    }
  }

  async updateCustomer(input: UpdateCustomerInput) {
    if (!Object.keys(input.patch).length) {
      return crmErr('VALIDATION_FAILED', 'At least one customer field is required.', false);
    }

    const idempotencyKey = adminMutationKey(
      'customer.update',
      input.customerId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.deps.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      const existing = await this.deps.customers.getUserById(input.customerId);
      if (!existing) return crmErr('NOT_FOUND', `Customer not found: ${input.customerId}`, false);
      return crmOk({ ...existing, ...input.patch }, true);
    }

    try {
      const updated = await this.deps.customers.updateCustomer(
        input.customerId,
        input.patch,
        { id: input.actor.id, email: input.actor.email },
      );
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'customer.update',
        targetId: input.customerId,
        after: input.patch,
        idempotencyKey,
      });
      await this.deps.operatorEventLog.markMutationCompleted(idempotencyKey);
      return crmOk(updated);
    } catch (error) {
      return crmFromError(error);
    }
  }

  async addCustomerNote(input: AddCustomerNoteInput) {
    if (!input.note?.trim()) {
      return crmErr('VALIDATION_FAILED', 'note is required.', false);
    }

    const idempotencyKey = adminMutationKey(
      'customer.note',
      input.customerId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.deps.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return crmOk({ customerId: input.customerId, note: input.note.trim() }, true);
    }

    try {
      await this.deps.customers.appendNote(input.customerId, input.note, {
        id: input.actor.id,
        email: input.actor.email,
      });
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'customer.note_added',
        targetId: input.customerId,
        after: { note: input.note.trim() },
        idempotencyKey,
      });
      await this.deps.operatorEventLog.markMutationCompleted(idempotencyKey);
      return crmOk({ customerId: input.customerId, note: input.note.trim() });
    } catch (error) {
      return crmFromError(error);
    }
  }

  async tagCustomer(input: TagCustomerInput) {
    if (!input.tags.length) {
      return crmErr('VALIDATION_FAILED', 'At least one tag is required.', false);
    }

    const idempotencyKey = adminMutationKey(
      'customer.tag',
      input.customerId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.deps.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      const user = await this.deps.customers.getUserById(input.customerId);
      const tags = Array.isArray(user?.metadata?.crmTags) ? (user!.metadata!.crmTags as string[]) : input.tags;
      return crmOk({ customerId: input.customerId, tags }, true);
    }

    try {
      const tags = await this.deps.customers.applyTags(input.customerId, input.tags, {
        id: input.actor.id,
        email: input.actor.email,
      });
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'customer.tagged',
        targetId: input.customerId,
        reason: input.reason,
        after: { tags },
        idempotencyKey,
      });
      await this.deps.operatorEventLog.markMutationCompleted(idempotencyKey);
      return crmOk({ customerId: input.customerId, tags });
    } catch (error) {
      return crmFromError(error);
    }
  }

  async mergeCustomers(input: MergeCustomersInput) {
    const reasonError = requireReason(input.reason);
    if (reasonError) return reasonError;
    if (input.sourceCustomerId === input.targetCustomerId) {
      return crmErr('VALIDATION_FAILED', 'Source and target customers must differ.', false);
    }

    const idempotencyKey = adminMutationKey(
      'customer.merge',
      `${input.sourceCustomerId}->${input.targetCustomerId}`,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.deps.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return crmOk({
        sourceCustomerId: input.sourceCustomerId,
        targetCustomerId: input.targetCustomerId,
        merged: true as const,
      }, true);
    }

    try {
      const source = await this.deps.customers.getUserById(input.sourceCustomerId);
      const target = await this.deps.customers.getUserById(input.targetCustomerId);
      if (!source || !target) {
        return crmErr('NOT_FOUND', 'Source or target customer not found.', false);
      }

      const mergedNotes = [target.notes, source.notes, `Merged from ${source.id} on ${new Date().toISOString()}`]
        .filter(Boolean)
        .join('\n');
      const sourceTags = Array.isArray(source.metadata?.crmTags) ? (source.metadata!.crmTags as string[]) : [];
      const targetTags = Array.isArray(target.metadata?.crmTags) ? (target.metadata!.crmTags as string[]) : [];
      const mergedTags = [...new Set([...targetTags, ...sourceTags, 'merged_source'])];
      const mergedMetadata = {
        ...(target.metadata ?? {}),
        crmTags: mergedTags,
        mergedFrom: [...(Array.isArray(target.metadata?.mergedFrom) ? (target.metadata!.mergedFrom as string[]) : []), source.id],
      };

      await this.deps.customers.updateCustomer(
        input.targetCustomerId,
        { notes: mergedNotes, metadata: mergedMetadata },
        { id: input.actor.id, email: input.actor.email },
      );
      await this.deps.customers.updateCustomer(
        input.sourceCustomerId,
        {
          metadata: {
            ...(source.metadata ?? {}),
            mergedInto: input.targetCustomerId,
            crmTags: [...sourceTags, 'merged_away'],
          },
        },
        { id: input.actor.id, email: input.actor.email },
      );

      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'customer.merged',
        targetId: input.targetCustomerId,
        reason: input.reason,
        before: { sourceCustomerId: input.sourceCustomerId },
        after: { targetCustomerId: input.targetCustomerId },
        idempotencyKey,
      });
      await this.deps.operatorEventLog.markMutationCompleted(idempotencyKey);

      return crmOk({
        sourceCustomerId: input.sourceCustomerId,
        targetCustomerId: input.targetCustomerId,
        merged: true as const,
      });
    } catch (error) {
      return crmFromError(error);
    }
  }

  private async recordOperatorEvent(params: {
    actor: { id: string; email: string; role?: string };
    action: string;
    targetId: string;
    reason?: string;
    before?: unknown;
    after?: unknown;
    idempotencyKey: string;
  }) {
    const event = {
      id: crypto.randomUUID(),
      actorId: params.actor.id,
      actorRole: (params.actor.role as 'admin' | 'owner' | 'system') ?? 'admin',
      action: params.action,
      targetType: 'user' as const,
      targetId: params.targetId,
      reason: params.reason,
      before: params.before,
      after: params.after,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    await this.deps.operatorEventLog.recordEvent(event);
    if (this.deps.commerceEventBus) {
      await this.deps.commerceEventBus.publish(mapCrmEventToEnvelope({
        id: event.id,
        action: params.action,
        customerId: params.targetId,
        actorId: params.actor.id,
        reason: params.reason,
        before: params.before,
        after: params.after,
        idempotencyKey: params.idempotencyKey,
        createdAt: event.createdAt,
      }));
    }
  }
}
