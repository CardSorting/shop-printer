# Commerce Protocol Laws

Architectural constitution for MeowAcc runtime commerce. Protocols mutate state; events describe reality.

## Layer model

```text
checkout  = money capture
refunds   = money reversal
inventory = stock movement
admin     = human authority
crm       = customer relationship truth
support   = issue resolution protocol
```

```text
route / admin / concierge
  → services.{checkout|refunds|inventory|admin|crm|support}.*
    → protocol orchestration (FlowService)
      → domain / infrastructure services (internal)
      → CommerceEventBus.publish() (operational truth)
```

## Laws

1. **Routes never mutate domain state directly.** Routes parse, authorize, and delegate intent to application services.
2. **Protocols own orchestration.** Flow services coordinate idempotency, validation, state transitions, and event emission.
3. **Infrastructure services are internal only.** Repositories and adapters are not imported by routes.
4. **Every mutation requires idempotency.** Duplicate requests must not double-apply side effects.
5. **Every mutation emits events.** Protocol-specific logs remain for claims; unified `commerce_events` records operational truth.
6. **Money mutations require actor + reason.** Refunds, cancellations, and destructive admin actions must identify who acted and why.
7. **Destructive operations require audit trails.** Archive, merge, cancel, and role changes write operator or support events.
8. **Protocols communicate through typed contracts.** `*ApplicationService` interfaces are the only public protocol surfaces.
9. **State transitions are explicit.** Ticket, order, checkout, and inventory states follow declared transition graphs.
10. **Unknown failures must be retry-safe.** Typed `*Result` envelopes distinguish validation, forbidden, and retryable (503) failures.

## Runtime roles (frozen)

```text
protocols = authority
events    = memory
timeline  = observability
laws      = constitution
```

Protocols mutate durable state. Events record what happened. Timeline reconstructs order for operators. This document is the constitution — the event architecture is frozen after post-commit inventory fan-out.

Cart is deliberately outside this operational event stream: `services.cart` owns purchase intent, and its `CartUxEventBus` is presentation-only. Cart never publishes payment, inventory, or order truth. See [cart.md](./cart.md).

## Unified commerce events

All protocols publish through `CommerceEventBus` into `commerce_events` (Firestore append-only store).

Shared envelope:

```ts
interface CommerceEventEnvelope<T> {
  id: string;
  type: string;
  protocol: 'checkout' | 'refund' | 'inventory' | 'admin' | 'support' | 'crm';
  actor?: { id: string; type: 'user' | 'admin' | 'system' | 'concierge' };
  entity: { type: 'order' | 'refund' | 'inventory' | 'ticket' | 'customer' | 'purchase_order'; id: string };
  correlationId?: string;
  idempotencyKey?: string;
  relatedOrderId?: string;
  occurredAt: string;
  payload: T;
}
```

## Cross-protocol invariants

| Event | Requires |
| --- | --- |
| `refund.created` | Prior `checkout.payment_confirmed` or `checkout.session_created` for same order |
| `inventory.reserved` | Prior `checkout.session_created` for same order |
| `ticket.linked_order` | Referenced order exists |

Invariant verification lives in `src/core/commerce/commerceInvariants.ts` and `src/tests/commerce-invariants.test.ts`.

## Correlation

Use `correlationId` (typically `order:{orderId}`) across checkout, inventory, refund, support, and admin mutations tied to the same order. This is the primary incident-debugging key.

## Post-commit inventory fan-out

Inventory ledger writes inside Firestore transactions must not publish commerce events until the transaction commits.

```ts
const pendingEvents: CommerceEventEnvelope[] = [];

await runWithPostCommitCommerceEvents(commerceEventBus, async () => {
  await runTransaction(async (tx) => {
    // mutate inventory / reservation / order
    // InventoryLedgerService queues events into the post-commit scope
  });
});
// publishMany runs only after the outer callback succeeds
```

Transactional checkout paths (`initialize order + reserve`, `finalize payment + confirm`, `rollback + release`) wrap `runTransaction` with `runWithPostCommitCommerceEvents`. Non-transactional inventory paths publish immediately as before.

## Timeline reconstruction

`GET /api/admin/orders/:id/timeline` reads the unified event stream and returns a chronological operator timeline for an order.

## What we deliberately avoid

- Distributed event brokers (Kafka, Pub/Sub) for runtime commerce
- Dual-write mutation paths (route → repo)
- Silent protocol bypasses without typed results

Operational truth is **consistent, queryable, and append-only** — not theatrical.

## Protocol guard

`src/tests/protocol-guard.test.ts` fails CI if API routes import legacy mutation services, commerce Firestore repositories, or call forbidden mutation paths. Storefront lane proofs: `npm run test:storefront-release` ([storefront-release.md](./storefront-release.md)). Operator docs: [operator-commerce-runtime.md](./operator-commerce-runtime.md), [commerce-incident-runbook.md](./commerce-incident-runbook.md).
