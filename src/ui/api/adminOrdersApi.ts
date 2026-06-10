import type { Order, OrderNote, OrderStatus } from '@domain/models';
import type { OrderTimelineEntry } from '@core/commerce/commerceEventTypes';
import { adminApiRequest } from './adminApiClient';

export type OrderListResult = {
  orders: Order[];
  nextCursor?: string;
};

export type ImportTrackingResult = {
  success: boolean;
  successCount: number;
  errors: string[];
};

export const adminOrdersApi = {
  listOrders(options?: {
    status?: OrderStatus;
    limit?: number;
    cursor?: string;
    signal?: AbortSignal;
  }): Promise<OrderListResult> {
    const qs = new URLSearchParams();
    if (options?.status) qs.set('status', options.status);
    if (options?.limit) qs.set('limit', String(options.limit));
    if (options?.cursor) qs.set('cursor', options.cursor);
    const query = qs.toString();
    return adminApiRequest<OrderListResult>(`/api/admin/orders${query ? `?${query}` : ''}`, {
      signal: options?.signal,
    });
  },

  getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
    return adminApiRequest<Order>(`/api/admin/orders/${orderId}`, { signal });
  },

  updateStatus(
    orderId: string,
    input: { status: OrderStatus; reason?: string; idempotencyKey?: string },
  ): Promise<void> {
    return adminApiRequest<void>(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  cancelOrder(
    orderId: string,
    input: { reason: string; idempotencyKey?: string },
  ): Promise<void> {
    return adminOrdersApi.updateStatus(orderId, {
      status: 'cancelled',
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });
  },

  batchUpdateStatus(input: {
    ids: string[];
    status: OrderStatus;
    reason?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; updatedCount: number; updatedIds: string[] }> {
    return adminApiRequest(`/api/admin/orders/batch`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  addNote(
    orderId: string,
    input: { note: string; idempotencyKey?: string },
  ): Promise<OrderNote> {
    return adminApiRequest<OrderNote>(`/api/admin/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        text: input.note,
        idempotencyKey: input.idempotencyKey,
      }),
    });
  },

  updateFulfillment(
    orderId: string,
    input: {
      trackingNumber?: string;
      shippingCarrier?: string;
      idempotencyKey?: string;
    },
  ): Promise<{ orderId: string }> {
    return adminApiRequest(`/api/admin/orders/${orderId}/fulfillment`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  exportPirateShipCsv(input: {
    ids: string[];
    packageDimensions?: { length: string; width: string; height: string };
    tareWeight?: number;
  }): Promise<string> {
    return adminApiRequest<string>('/api/admin/orders/export/pirate-ship', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  importTracking(input: {
    rows: Array<{ orderId: string; trackingNumber: string; carrier?: string }>;
    idempotencyKey?: string;
  }): Promise<ImportTrackingResult> {
    return adminApiRequest('/api/admin/orders/import/tracking', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getTimeline(orderId: string, signal?: AbortSignal): Promise<{
    orderId: string;
    correlationId: string;
    entries: OrderTimelineEntry[];
  }> {
    return adminApiRequest(`/api/admin/orders/${orderId}/timeline`, { signal });
  },
};
