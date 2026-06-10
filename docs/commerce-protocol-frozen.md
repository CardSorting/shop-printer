# Commerce Protocol — FROZEN

This is the architecture line for commerce mutations. Do not extend behavior by calling raw services from routes, tools, admin actions, or automations.

## Core map

```txt
checkout  = money capture
refunds   = money reversal
inventory = stock movement
admin     = human authority
```

## Invariant

```txt
No route, tool, admin action, or automation touches raw money mutation services directly.
```

Raw services are infrastructure/internal.

`ApplicationService` protocols are the only public mutation boundary.

New commerce behavior must enter through:

- `CheckoutApplicationService` — `services.checkout`
- `RefundApplicationService` — `services.refunds`
- `InventoryApplicationService` — `services.inventory`
- `AdminApplicationService` — `services.admin`

Admin authorizes operator actions and delegates money reversal to `RefundApplicationService` and stock movement to `InventoryApplicationService`. Concierge and other privileged tools follow the same rule.

## Proof ladders

Per-protocol verification lives in dedicated docs and tests:

- Checkout — [docs/checkout.md](./checkout.md) (§13 Frozen policy)
- Inventory — [docs/inventory.md](./inventory.md)
- Refunds — `src/tests/refund-verification-ladder.test.ts`
- Admin — `src/tests/admin-verification-ladder.test.ts`

## Policy

Extend behavior inside flow services and protocol stacks. Do not add parallel mutation entry points.

Leave money paths alone unless a new use case appears.
