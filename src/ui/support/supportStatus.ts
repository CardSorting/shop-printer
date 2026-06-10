import type { TicketStatus } from '@domain/models';

export const SUPPORT_STATUS_LABELS = {
  new: 'New',
  open: 'Open',
  pending_customer: 'Pending customer',
  pending_internal: 'Pending internal',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
} as const;

export type CanonicalSupportStatus = keyof typeof SUPPORT_STATUS_LABELS;

const LEGACY_STATUS_MAP: Record<string, CanonicalSupportStatus> = {
  pending: 'pending_customer',
  on_hold: 'pending_internal',
  solved: 'resolved',
};

export function normalizeSupportStatus(status: string | null | undefined): CanonicalSupportStatus | null {
  if (!status) return null;
  if (status in SUPPORT_STATUS_LABELS) return status as CanonicalSupportStatus;
  return LEGACY_STATUS_MAP[status] ?? null;
}

export function getSupportStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeSupportStatus(status);
  if (!normalized) return 'Unknown';
  return SUPPORT_STATUS_LABELS[normalized];
}

export function isResolvedTicketStatus(status: string | null | undefined): boolean {
  const normalized = normalizeSupportStatus(status);
  return normalized === 'resolved' || normalized === 'closed';
}

export function isActiveTicketStatus(status: string | null | undefined): boolean {
  return !isResolvedTicketStatus(status);
}

export const CANONICAL_SUPPORT_STATUSES = Object.keys(SUPPORT_STATUS_LABELS) as CanonicalSupportStatus[];

export function getSupportStatusBadgeType(status: string | null | undefined): 'blue' | 'green' | 'amber' | 'gray' {
  const normalized = normalizeSupportStatus(status);
  switch (normalized) {
    case 'new':
      return 'blue';
    case 'open':
      return 'green';
    case 'pending_customer':
    case 'pending_internal':
    case 'reopened':
      return 'amber';
    case 'resolved':
    case 'closed':
      return 'gray';
    default:
      return 'gray';
  }
}

export function toCanonicalTicketStatus(status: string | null | undefined): TicketStatus | undefined {
  const normalized = normalizeSupportStatus(status);
  return normalized ?? undefined;
}
