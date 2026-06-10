import * as crypto from 'node:crypto';

export function ensureCorrelationId(existing?: string | null): string {
  const trimmed = existing?.trim();
  if (trimmed) return trimmed;
  return crypto.randomUUID();
}

export function orderCorrelationId(orderId: string, suffix?: string): string {
  return suffix ? `order:${orderId}:${suffix}` : `order:${orderId}`;
}
