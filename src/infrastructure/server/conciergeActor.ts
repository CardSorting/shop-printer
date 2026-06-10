import type { AdminActor } from '@core/admin/adminTypes';
import type { AdminResult } from '@core/admin/adminResult';

export const CONCIERGE_ADMIN_ACTOR: AdminActor = {
  id: 'concierge',
  email: 'concierge@woodbine.com',
  role: 'system',
};

export function requireConciergeAdminResult<T>(result: AdminResult<T>, action: string): T {
  if (!result.ok) {
    throw new Error(`${action}: ${result.message}`);
  }
  return result.data;
}
