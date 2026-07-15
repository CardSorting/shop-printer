# Release Checklist

Pre-release gate for DreamBees Art — use before merging to main or deploying production.

---

## Code quality

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (full suite)
- [ ] `npm run build` succeeds

---

## Storefront release gate (if cart, checkout, catalog, or PDP touched)

- [ ] `npm run test:storefront-release` passes (guards + production proofs)

```bash
npm run test:storefront-release
```

Detail: [storefront-release.md](./storefront-release.md)

---

## Commerce protocol seals

- [ ] `checkout-verification-ladder.test.ts` passes
- [ ] `inventory-verification-ladder.test.ts` passes
- [ ] `inventory-location-consistency-ladder.test.ts` passes (if inventory/PO touched)
- [ ] `refund-verification-ladder.test.ts` passes (if refund/admin/concierge touched)
- [ ] `admin-verification-ladder.test.ts` passes (if admin routes touched)

```bash
npm test -- --run src/tests/*-verification-ladder.test.ts
```

If you changed checkout flows also run:

```bash
npm test -- --run \
  src/tests/checkout-webhook-ingress.test.ts \
  src/tests/financial-recovery-hardening.test.ts
```

Detail: [testing.md](./testing.md)

---

## Manual smoke (staging)

- [ ] Storefront loads; product page renders
- [ ] Add to cart → checkout → test card → order **paid** (not pending)
- [ ] Admin login → order visible
- [ ] Inventory adjust on test SKU (batch, not product PATCH)
- [ ] If refund changed: test refund with reason + idempotency (staging Stripe)

Webhook forwarding or staging webhook endpoint verified.

---

## E2E (recommended for UI/checkout releases)

- [ ] `npm run test:e2e:checkout-smoke` passes (mocked checkout — fast)
- [ ] `npm run test:e2e:cart-smoke` passes when cart, storage, merge, or cart-to-checkout handoff changed
- [ ] `npm run test:e2e` passes on CI or locally (full suite, optional)

---

## Production deploy (if shipping)

From [production-readiness.md](./production-readiness.md) and [deployment.md](./deployment.md):

- [ ] `GET /api/system/health/protocols` returns `ok: true` on staging/production

- [ ] Production env vars set (not dev secrets)
- [ ] `ALLOW_PRODUCTION_SEEDING=false`
- [ ] Live Stripe webhook registered → `/api/webhooks/stripe`
- [ ] `SYSTEM_JOB_TOKEN` set; cleanup cron scheduled
- [ ] Firestore rules deployed
- [ ] Demo admin password removed
- [ ] `SESSION_SECRET` unique to production

Post-deploy: [runbook.md § Daily checks](./runbook.md#daily-checks-5-min)

---

## Documentation (if behavior changed)

- [ ] Protocol doc updated (`checkout.md`, `inventory.md`, `refunds.md`)
- [ ] [flows.md](./flows.md) if user-visible story changed
- [ ] [api-overview.md](./api-overview.md) if new routes
- [ ] [environment-variables.md](./environment-variables.md) if new env vars
- [ ] [glossary.md](./glossary.md) if new terms

---

## Security

- [ ] No secrets in diff
- [ ] No new direct Stripe/refund/stock calls from routes
- [ ] [security.md checklist](./security.md#security-checklist-production) reviewed

---

## Rollback plan

- [ ] Previous hosting release identified in Firebase Console
- [ ] No destructive Firestore migration without backup
- [ ] On-call knows [troubleshooting.md](./troubleshooting.md) webhook section

---

## Related

- [deployment.md](./deployment.md)
- [runbook.md](./runbook.md)
- [contributing-commerce.md](./contributing-commerce.md)
