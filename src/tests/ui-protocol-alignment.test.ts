import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

describe('UI protocol alignment (proof ladder)', () => {
  it('[AdminOrders] does not import useServices or services.*', () => {
    const source = read('src/ui/pages/admin/AdminOrders.tsx');
    expect(source).not.toMatch(/useServices/);
    expect(source).not.toMatch(/services\./);
    expect(source).toMatch(/adminOrdersApi/);
  });

  it('[AdminOrderDetail] does not import useServices or services.*', () => {
    const source = read('src/ui/pages/admin/AdminOrderDetail.tsx');
    expect(source).not.toMatch(/useServices/);
    expect(source).not.toMatch(/services\./);
    expect(source).toMatch(/adminOrdersApi/);
    expect(source).toMatch(/getTimeline/);
  });

  it('[AdminOrders] mutations call /api/admin/orders routes via adminOrdersApi', () => {
    const source = read('src/ui/api/adminOrdersApi.ts');
    expect(source).toMatch(/\/api\/admin\/orders/);
    expect(source).toMatch(/updateStatus/);
    expect(source).toMatch(/batchUpdateStatus/);
    expect(source).toMatch(/addNote/);
    expect(source).toMatch(/exportPirateShipCsv/);
    expect(source).toMatch(/importTracking/);
  });

  it('[ticket UI] uses canonical support status helpers', () => {
    const tickets = read('src/ui/pages/admin/AdminTickets.tsx');
    const detail = read('src/ui/pages/admin/AdminTicketDetail.tsx');
    expect(tickets).toMatch(/canonicalTicketStatusLabel|getSupportStatusLabel/);
    expect(detail).toMatch(/CANONICAL_SUPPORT_STATUSES/);
    expect(tickets).not.toMatch(/\bsolved\b/);
    expect(tickets).not.toMatch(/\bon_hold\b/);
    expect(detail).not.toMatch(/status:\s*'pending'/);
  });

  it('[commerce helpers] expose canonical labels and timeline formatter', () => {
    const source = read('src/ui/commerce/commerceUiHelpers.ts');
    expect(source).toMatch(/canonicalOrderStatusLabel/);
    expect(source).toMatch(/canonicalTicketStatusLabel/);
    expect(source).toMatch(/formatCommerceTimelineEvent/);
  });

  it('[admin API client] surfaces AdminResult-style errors', () => {
    const source = read('src/ui/api/adminApiClient.ts');
    expect(source).toMatch(/AdminApiError/);
    expect(source).toMatch(/formatAdminApiError/);
    expect(source).toMatch(/retryable/);
  });
});
