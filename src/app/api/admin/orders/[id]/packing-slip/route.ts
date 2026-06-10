import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';
import { formatCurrency } from '@utils/formatters';

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id } = await params;
        const services = await getServerServices();
        const orderResult = await services.admin.getAdminOrder({
            actor: toAdminActor(user),
            orderId: id,
        });
        if (!orderResult.ok) return adminRouteResponse(orderResult);
        const order = orderResult.data;
        const safeFileId = order.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'order';

        const address = order.shippingAddress;
        const itemRows = order.items.map(item => `
            <tr>
                <td>
                    <strong>${escapeHtml(item.name)}</strong>
                    ${item.variantTitle ? `<div class="muted">${escapeHtml(item.variantTitle)}</div>` : ''}
                    ${item.productHandle ? `<div class="muted">${escapeHtml(item.productHandle)}</div>` : ''}
                </td>
                <td>${escapeHtml(item.productId)}${item.variantId ? `<div class="muted">${escapeHtml(item.variantId)}</div>` : ''}</td>
                <td class="qty">${escapeHtml(item.quantity)}</td>
            </tr>
        `).join('');

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Packing Slip ${escapeHtml(order.id)}</title>
  <style>
    body { color: #111827; font-family: Arial, sans-serif; margin: 32px; }
    header { align-items: flex-start; border-bottom: 2px solid #111827; display: flex; justify-content: space-between; padding-bottom: 18px; }
    h1 { font-size: 24px; letter-spacing: 0; margin: 0 0 6px; }
    h2 { font-size: 13px; letter-spacing: 0.08em; margin: 28px 0 10px; text-transform: uppercase; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #f3f4f6; font-size: 11px; letter-spacing: 0.08em; padding: 10px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #e5e7eb; padding: 12px 10px; vertical-align: top; }
    .muted { color: #6b7280; font-size: 12px; margin-top: 3px; }
    .qty { font-size: 18px; font-weight: 700; text-align: center; }
    .box { border: 1px solid #d1d5db; padding: 14px; }
    .grid { display: grid; gap: 18px; grid-template-columns: 1fr 1fr; }
    .right { text-align: right; }
    @media print { body { margin: 18mm; } button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Print</button>
  <header>
    <div>
      <h1>WoodBine</h1>
      <div class="muted">Packing Slip</div>
    </div>
    <div class="right">
      <strong>Order #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</strong>
      <div class="muted">${escapeHtml(order.createdAt.toLocaleDateString())}</div>
      <div class="muted">Status: ${escapeHtml(order.status)}</div>
    </div>
  </header>

  <section class="grid">
    <div>
      <h2>Ship To</h2>
      <div class="box">
        <strong>${escapeHtml(order.customerName || 'Customer')}</strong><br />
        ${escapeHtml(address.street)}<br />
        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.zip || address.zipCode || '')}<br />
        ${escapeHtml(address.country)}
      </div>
    </div>
    <div>
      <h2>Order Details</h2>
      <div class="box">
        <div>Total paid: ${escapeHtml(formatCurrency(order.total))}</div>
        <div>Shipping: ${escapeHtml(formatCurrency(order.shippingAmount || 0))}</div>
        ${order.shippingCarrier ? `<div>Carrier: ${escapeHtml(order.shippingCarrier)}</div>` : ''}
        ${order.trackingNumber ? `<div>Tracking: ${escapeHtml(order.trackingNumber)}</div>` : ''}
      </div>
    </div>
  </section>

  <h2>Items</h2>
  <table>
    <thead>
      <tr><th>Item</th><th>Product</th><th class="qty">Qty</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${order.customerNote ? `<h2>Customer Note</h2><div class="box">${escapeHtml(order.customerNote)}</div>` : ''}
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `inline; filename="packing-slip-${safeFileId}.html"`,
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        return jsonError(error, 'Failed to generate packing slip');
    }
}
