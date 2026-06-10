import type { ICommerceEventBus } from './commerceEventBus';
import type { CommerceEventEnvelope } from './commerceEventTypes';

/** Protocol can publish unified commerce events. */
export interface CanWriteEvents {
  readonly commerceEventBus: ICommerceEventBus;
}

/** Protocol mutations require an authenticated actor. */
export interface CanRequireActor {
  requireActor(actor: { id?: string }): void;
}

/** Protocol mutations require idempotency keys. */
export interface CanUseIdempotency {
  requireIdempotencyKey(key?: string): void;
}

/** Protocol emits append-only audit trails through the commerce event bus. */
export interface CanEmitAuditTrail {
  emitAudit(event: CommerceEventEnvelope): Promise<void>;
}
