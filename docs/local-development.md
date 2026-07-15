# Local Development

Day-to-day developer workflow for MeowAcc. Assumes [onboarding.md](./onboarding.md) is complete.

---

## Daily startup

```bash
# Terminal 1 — app
npm run dev

# Terminal 2 — Stripe webhooks (required for paid orders)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy `whsec_…` from Terminal 2 into `.env` → `STRIPE_WEBHOOK_SECRET` → restart Terminal 1 if first time.

App: `http://localhost:3000` · Admin: `http://localhost:3000/admin`

If port 3000 hangs (curl times out): `npm run cleanup` then restart.

---

## Storefront verification

```bash
npm run test:storefront-release
npm run test:e2e:cart-smoke
npm run test:e2e:checkout-smoke
```

First Playwright run: `npx playwright install chromium`

See [storefront-release.md](./storefront-release.md).

---

## npm scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack, port 3000) |
| `npm run setup` | First-time env + install + seed |
| `npm run cleanup` | Free stuck ports |
| `npm test` | Vitest watch mode |
| `npm test -- --run <file>` | Single run |
| `npm run test:storefront-release` | Frozen storefront proof suite |
| `npm run test:e2e:cart-smoke` | Isolated cart-to-checkout Playwright smoke |
| `npm run test:e2e:checkout-smoke` | Isolated mocked checkout Playwright smoke |
| `npm run dev:e2e` | Dev server with E2E mock pay button |
| `npm run test:e2e` | Full Playwright suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build locally |
| `npm run seed` | Re-run seed script |
| `npm run benchmark:order-flow` | Core throughput benchmark |

---

## Project layout (where to work)

| Task | Start here |
| --- | --- |
| Storefront page | `src/app/<route>/page.tsx` + `src/ui/pages/` |
| Admin page | `src/app/admin/...` + `src/ui/pages/admin/` |
| New API route | `src/app/api/.../route.ts` |
| Commerce logic | `src/core/` — **protocols first** |
| Domain rules | `src/domain/` — pure, no I/O |
| Firestore adapter | `src/infrastructure/repositories/firestore/` |
| Browser API calls | `src/ui/apiClientServices.ts` |

Architecture: [architecture.md](./architecture.md)

---

## Debugging checkout

### Symptom: order stays pending

1. Is `stripe listen` running?
2. Does `STRIPE_WEBHOOK_SECRET` match current CLI session?
3. Check terminal for `checkout_webhook_payment_succeeded` logs
4. Try success URL verify: network tab for `POST /api/checkout/verify`

### Trace a checkout in code

Set breakpoint or log in order:

```text
src/app/api/checkout/create-payment-intent/route.ts
  → CheckoutFlowService.createCheckoutSession
  → checkoutClientStartFlow
  → inventory.reserveInventory (InventoryFlowService)
```

Finalization:

```text
src/app/api/webhooks/stripe/route.ts
  → handleCheckoutWebhook
  → confirmStripePayment (internal)
```

Guide: [checkout.md § When things go wrong](./checkout.md#when-things-go-wrong)

---

## Debugging inventory

| Symptom | Check |
| --- | --- |
| Can't add to cart | `checkAvailability` — product stock and reservation holds |
| Stock wrong after checkout | Reservation commit/release path — not product PATCH |
| Admin adjust fails | Route uses `services.inventory` — idempotency key present? |

Ledger: `GET /api/admin/inventory/ledger?productId=...` (as admin)

---

## Debugging admin / refunds

| Symptom | Check |
| --- | --- |
| Refund 403 | Admin elevation + reason in request |
| Route imports `refundService` | Protocol violation — use `services.admin.requestRefund` |

Run seal tests:

```bash
npm test -- --run src/tests/refund-verification-ladder.test.ts
npm test -- --run src/tests/admin-verification-ladder.test.ts
```

---

## Hot reload notes

- **Next.js Turbopack** — fast refresh for UI and route handlers
- **Env changes** — require server restart
- **Container singletons** — `getServerServices()` caches; restart after Core wiring changes
- **Stripe webhook secret** — changes when restarting `stripe listen`

---

## Re-seed local data

```bash
npm run seed
# or full setup (also npm install)
npm run setup
```

Warning: overwrites seeded catalog patterns. Use dev Firebase project only.

---

## Running subsets of tests

```bash
# One protocol
npm test -- --run src/tests/checkout-verification-ladder.test.ts

# Checkout depth
npm test -- --run src/tests/checkout-webhook-ingress.test.ts

# Watch mode while editing
npm test src/tests/inventory-protocol.test.ts
```

Full map: [testing.md](./testing.md)

---

## Playwright locally

```bash
npm run dev   # or let Playwright webServer start it
npm run test:e2e
npm run test:e2e -- e2e/industrialized-commerce-v10.spec.ts
```

Reports: `playwright-report/`

---

## Common dev mistakes

| Mistake | Fix |
| --- | --- |
| Editing product stock in admin product form | Use `/admin/inventory` batch |
| Calling Stripe in new route | Delegate to `services.checkout` |
| Forgetting idempotency key in manual API test | Send `idempotencyKey` in body |
| Testing refunds without elevation | Use elevated admin session |
| Using production Firebase in dev | Separate Firebase projects |

---

## IDE tips

- **Typecheck on save:** run `npm run typecheck` before PR
- **Jump to protocol:** search `ApplicationService` interfaces in `src/core/*/`
- **Find route handler:** `src/app/api` + path segment

---

## Related

- [onboarding.md](./onboarding.md)
- [day-2.md](./day-2.md)
- [troubleshooting.md](./troubleshooting.md)
- [contributing-commerce.md](./contributing-commerce.md)
- [environment-variables.md](./environment-variables.md)
