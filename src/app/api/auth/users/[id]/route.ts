import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';
import { jsonError, readJsonObject, requireAdminSession, requireStepUpAdminSession } from '@infrastructure/server/apiGuards';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { crmRouteResponse } from '@infrastructure/server/crmRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import type { JsonValue, UserRole } from '@domain/models';

const USER_ROLES = new Set<UserRole>(['customer', 'admin']);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const actorUser = await requireAdminSession();
        const { id } = await params;
        const body = await readJsonObject(request);

        const updates: {
            displayName?: string;
            role?: UserRole;
            notes?: string;
            metadata?: Record<string, JsonValue>;
        } = {};

        if ('displayName' in body) {
            if (typeof body.displayName !== 'string' || !body.displayName.trim()) {
                throw new DomainError('Display name is required.');
            }
            updates.displayName = body.displayName.trim();
        }

        if ('role' in body) {
            if (typeof body.role !== 'string' || !USER_ROLES.has(body.role as UserRole)) {
                throw new DomainError('Role is invalid.');
            }
            updates.role = body.role as UserRole;
        }

        if ('notes' in body) {
            if (body.notes !== null && typeof body.notes !== 'string') {
                throw new DomainError('Notes must be text.');
            }
            updates.notes = typeof body.notes === 'string' ? body.notes : '';
        }

        if ('metadata' in body) {
            if (!body.metadata || typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
                throw new DomainError('Metadata must be a JSON object.');
            }
            updates.metadata = body.metadata as Record<string, JsonValue>;
        }

        if (Object.keys(updates).length === 0) {
            throw new DomainError('No supported user updates were provided.');
        }

        const services = await getServerServices();

        if (updates.role !== undefined) {
            const elevatedUser = await requireStepUpAdminSession(request);
            const reason = typeof body.reason === 'string' ? body.reason : '';
            const result = await services.admin.updateUserRole({
                actor: toAdminActor(elevatedUser, { elevated: true }),
                userId: id,
                role: updates.role,
                reason,
                idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
            });
            if (!result.ok) {
                return adminRouteResponse(result);
            }

            const { role: _role, ...rest } = updates;
            if (Object.keys(rest).length === 0) {
                return NextResponse.json(result.data);
            }

            const crmResult = await services.crm.updateCustomer({
                actor: toAdminActor(actorUser),
                customerId: id,
                patch: rest,
                idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
            });
            return crmRouteResponse(crmResult);
        }

        const crmResult = await services.crm.updateCustomer({
            actor: toAdminActor(actorUser),
            customerId: id,
            patch: updates,
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });
        return crmRouteResponse(crmResult);
    } catch (error) {
        return jsonError(error, 'Failed to update user');
    }
}
