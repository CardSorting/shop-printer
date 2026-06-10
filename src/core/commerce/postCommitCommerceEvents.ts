import { AsyncLocalStorage } from 'node:async_hooks';
import type { ICommerceEventBus } from './commerceEventBus';
import type { CommerceEventEnvelope } from './commerceEventTypes';

type PostCommitCommerceScope = {
  pending: CommerceEventEnvelope[];
  seenKeys: Set<string>;
};

const postCommitScope = new AsyncLocalStorage<PostCommitCommerceScope>();

function eventDedupeKey(event: CommerceEventEnvelope): string {
  return event.idempotencyKey ?? event.id;
}

function dedupeCommerceEvents(events: CommerceEventEnvelope[]): CommerceEventEnvelope[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = eventDedupeKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isInPostCommitCommerceScope(): boolean {
  return postCommitScope.getStore() !== undefined;
}

export function queuePostCommitCommerceEvent(event: CommerceEventEnvelope): void {
  const scope = postCommitScope.getStore();
  if (!scope) return;
  const key = eventDedupeKey(event);
  if (scope.seenKeys.has(key)) return;
  scope.seenKeys.add(key);
  scope.pending.push(event);
}

/**
 * Collects commerce events during a transactional mutation scope and publishes
 * them only after the outer callback resolves successfully.
 */
export async function runWithPostCommitCommerceEvents<T>(
  bus: ICommerceEventBus | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const scope: PostCommitCommerceScope = { pending: [], seenKeys: new Set() };
  return postCommitScope.run(scope, async () => {
    const result = await fn();
    if (bus && scope.pending.length > 0) {
      await bus.publishMany(dedupeCommerceEvents(scope.pending));
    }
    return result;
  });
}
