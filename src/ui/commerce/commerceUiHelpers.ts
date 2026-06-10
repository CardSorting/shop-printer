import type { OrderTimelineEntry } from '@core/commerce/commerceEventTypes';
import type { OrderStatus } from '@domain/models';
import { formatRelativeTime, formatShortDate } from '@utils/formatters';
import {
  getSupportStatusBadgeType,
  getSupportStatusLabel,
  normalizeSupportStatus,
} from '../support/supportStatus';

export { getSupportStatusBadgeType };

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending: 'Pending payment',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
  ready_for_pickup: 'Ready for pickup',
  delivery_started: 'Out for delivery',
  reconciling: 'Reconciling',
};

export function canonicalOrderStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  if (status in ORDER_STATUS_LABELS) {
    return ORDER_STATUS_LABELS[status as OrderStatus];
  }
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function canonicalTicketStatusLabel(status: string | null | undefined): string {
  return getSupportStatusLabel(status);
}

export function isCanonicalTicketStatus(status: string | null | undefined): boolean {
  return normalizeSupportStatus(status) !== null;
}

export function formatCommerceTimelineEvent(entry: OrderTimelineEntry): string {
  const when = entry.occurredAt
    ? formatRelativeTime(new Date(entry.occurredAt))
    : 'Unknown time';
  const actor = entry.actor?.type ? ` · ${entry.actor.type}` : '';
  return `${entry.label} · ${entry.protocol}${actor} · ${when}`;
}

export function formatCommerceTimelineSubtitle(entry: OrderTimelineEntry): string {
  const date = entry.occurredAt ? formatShortDate(entry.occurredAt) : '';
  const parts = [entry.type, entry.protocol, date].filter(Boolean);
  return parts.join(' · ');
}

export function commerceTimelineProtocolColor(protocol: OrderTimelineEntry['protocol']): string {
  switch (protocol) {
    case 'checkout':
      return 'bg-green-500';
    case 'inventory':
      return 'bg-blue-500';
    case 'refund':
      return 'bg-red-500';
    case 'support':
      return 'bg-amber-500';
    case 'admin':
      return 'bg-purple-500';
    case 'crm':
      return 'bg-indigo-500';
    default:
      return 'bg-gray-400';
  }
}
