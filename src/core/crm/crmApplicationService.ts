import type { CustomerSummary, JsonValue, User } from '@domain/models';
import type { CrmResult } from './crmResult';
import type { CrmActor } from './crmTypes';

export type ListCustomersResult = CustomerSummary[];
export type CustomerProfileResult = User & { supportSummary?: unknown };
export type CustomerResult = User;
export type CustomerNoteResult = { customerId: string; note: string };
export type CustomerTagResult = { customerId: string; tags: string[] };
export type MergeCustomersResult = { sourceCustomerId: string; targetCustomerId: string; merged: true };

export type ListCustomersInput = { actor: CrmActor };
export type GetCustomerInput = { actor: CrmActor; customerId: string };
export type UpdateCustomerInput = {
  actor: CrmActor;
  customerId: string;
  patch: {
    displayName?: string;
    notes?: string;
    metadata?: Record<string, JsonValue>;
  };
  idempotencyKey?: string;
};
export type AddCustomerNoteInput = {
  actor: CrmActor;
  customerId: string;
  note: string;
  idempotencyKey?: string;
};
export type TagCustomerInput = {
  actor: CrmActor;
  customerId: string;
  tags: string[];
  idempotencyKey?: string;
  reason?: string;
};
export type MergeCustomersInput = {
  actor: CrmActor;
  sourceCustomerId: string;
  targetCustomerId: string;
  reason: string;
  idempotencyKey?: string;
};

export interface CrmApplicationService {
  listCustomers(input: ListCustomersInput): Promise<CrmResult<ListCustomersResult>>;
  getCustomer(input: GetCustomerInput): Promise<CrmResult<CustomerProfileResult>>;
  updateCustomer(input: UpdateCustomerInput): Promise<CrmResult<CustomerResult>>;
  addCustomerNote(input: AddCustomerNoteInput): Promise<CrmResult<CustomerNoteResult>>;
  tagCustomer(input: TagCustomerInput): Promise<CrmResult<CustomerTagResult>>;
  mergeCustomers(input: MergeCustomersInput): Promise<CrmResult<MergeCustomersResult>>;
}
