import { describe, expect, it } from 'vitest';
import {
  parsePurchaseOrderAction,
  parsePurchaseOrderCreate,
  parsePurchaseOrderListOptions,
  parseReceiveItems,
} from './parsers';

describe('admin purchase order parsers', () => {
  const user = { id: 'admin-1', email: 'admin@example.com' };

  it('normalizes create payloads and bounds list options', () => {
    const create = parsePurchaseOrderCreate({
      supplier: ' Acme ',
      expectedAt: '2026-06-01',
      items: [{ productId: 'p1', orderedQty: 3, unitCost: 250 }],
    }, user);
    const options = parsePurchaseOrderListOptions(new URLSearchParams('status=ordered&limit=500&offset=2'));

    expect(create.supplier).toBe('Acme');
    expect(create.adminUserId).toBe('admin-1');
    expect(create.expectedAt).toBeInstanceOf(Date);
    expect(options).toEqual({ status: 'ordered', supplier: undefined, limit: 100, offset: 2 });
  });

  it('rejects invalid status, duplicate products, and unknown actions', () => {
    expect(() => parsePurchaseOrderListOptions(new URLSearchParams('status=sent'))).toThrow('Purchase order status is invalid');
    expect(() => parsePurchaseOrderCreate({
      supplier: 'Acme',
      items: [
        { productId: 'p1', orderedQty: 1, unitCost: 100 },
        { productId: 'p1', orderedQty: 2, unitCost: 100 },
      ],
    }, user)).toThrow('Duplicate product p1');
    expect(() => parsePurchaseOrderAction({ action: 'ship' })).toThrow('Unknown purchase order action');
  });

  it('validates receiving lines before the service mutates inventory', () => {
    const receive = parseReceiveItems({
      items: [{ purchaseOrderItemId: 'line-1', receivedQty: 2, damagedQty: 0, condition: 'new', disposition: 'add_to_stock' }],
      idempotencyKey: 'receive-1',
    }, 'po-1', 'admin-1');

    expect(receive.items[0]).toMatchObject({ purchaseOrderItemId: 'line-1', receivedQty: 2, condition: 'new' });
    expect(() => parseReceiveItems({
      items: [{ purchaseOrderItemId: 'line-1', receivedQty: 1, condition: 'new' }, { purchaseOrderItemId: 'line-1', receivedQty: 1, condition: 'new' }],
    }, 'po-1', 'admin-1')).toThrow('Duplicate received line line-1');
    expect(() => parseReceiveItems({
      items: [{ purchaseOrderItemId: 'line-1', receivedQty: 1, condition: 'used' }],
    }, 'po-1', 'admin-1')).toThrow('condition is invalid');
  });
});
