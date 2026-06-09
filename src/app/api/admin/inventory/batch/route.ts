import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import { inventoryRouteResponse } from '@infrastructure/server/inventoryRouteAdapter';
import { requireAdminSession, readJsonObject, jsonError, requireString } from '@infrastructure/server/apiGuards';

const MAX_INVENTORY_BATCH_UPDATES = 100;

function parseInventoryUpdate(value: unknown, index: number): { id: string; variantId?: string; stock: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError(`updates[${index}] must be an object`);
  }

  const update = value as Record<string, unknown>;
  const stock = Number(update.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    throw new DomainError(`updates[${index}].stock must be a non-negative integer`);
  }

  return {
    id: requireString(update.id, `updates[${index}].id`),
    variantId: update.variantId === undefined ? undefined : requireString(update.variantId, `updates[${index}].variantId`),
    stock,
  };
}

/**
 * [LAYER: API]
 * Bulk inventory updates for both products and specific variants.
 * Restricted to administrative staff.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const actor = { id: user.id, email: user.email };
    const services = await getServerServices();

    const body = await readJsonObject(request);
    const { updates, idempotencyKey: bodyKey, note } = body;

    if (!Array.isArray(updates)) throw new DomainError('Updates must be an array');
    if (updates.length === 0) throw new DomainError('Updates must not be empty');
    if (updates.length > MAX_INVENTORY_BATCH_UPDATES) {
      throw new DomainError(`Cannot update more than ${MAX_INVENTORY_BATCH_UPDATES} inventory records at once`);
    }

    const parsed = updates.map(parseInventoryUpdate);
    const idempotencyKey = typeof bodyKey === 'string' && bodyKey.trim()
      ? bodyKey.trim()
      : `admin-batch:${actor.id}:${Date.now()}:${parsed.map((u) => `${u.id}:${u.variantId ?? ''}:${u.stock}`).join('|')}`;

    const result = await services.inventory.adjustInventory({
      updates: parsed.map((u) => ({
        productId: u.id,
        variantId: u.variantId,
        stock: u.stock,
      })),
      idempotencyKey,
      actor: 'admin',
      actorUserId: actor.id,
      actorEmail: actor.email,
      note: typeof note === 'string' ? note : undefined,
    });

    if (!result.ok) {
      return inventoryRouteResponse(result);
    }

    return NextResponse.json({ success: true, updatedCount: updates.length, duplicate: result.duplicate ?? false });
  } catch (err) {
    console.error('[API] Inventory Batch Update Failed:', err);
    return jsonError(err, 'Inventory Batch Update Failed');
  }
}
