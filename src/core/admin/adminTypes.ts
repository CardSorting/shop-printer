export type AdminActorRole = 'admin' | 'owner' | 'system';

export type AdminActor = {
  id: string;
  email: string;
  role: AdminActorRole;
  /** Step-up session — required for elevated mutations such as role changes. */
  elevated?: boolean;
};

export type AdminOperatorTargetType =
  | 'product'
  | 'order'
  | 'inventory'
  | 'purchase_order'
  | 'user'
  | 'reconciliation_case';

export type AdminOperatorEvent = {
  id: string;
  actorId: string;
  actorRole: AdminActorRole;
  action: string;
  targetType: AdminOperatorTargetType;
  targetId: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  idempotencyKey: string;
  createdAt: string;
};
