import type { AdminActor } from '@core/admin/adminTypes';
import type { User } from '@domain/models';

export function toAdminActor(
  user: User & { role: 'admin' },
  options?: { elevated?: boolean },
): AdminActor {
  return {
    id: user.id,
    email: user.email,
    role: 'admin',
    elevated: options?.elevated,
  };
}
