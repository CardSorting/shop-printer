# Production Readiness

Operational gate before deploying MeowAcc. No architecture — just deployability.

**Related:** [deployment.md](./deployment.md) · [release-checklist.md](./release-checklist.md) · [commerce-incident-runbook.md](./commerce-incident-runbook.md) · [environment-variables.md](./environment-variables.md)

---

## Required environment (production)

Validated by `validateProductionEnv()` when `NODE_ENV=production`. Missing values fail API readiness via `getServerServices()` and return **503** from the protocol health endpoint.

| Variable | Why |
| --- | --- |
| `SESSION_SECRET` | Session signing — 32+ chars, not dev placeholder |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK (unless host provides ADC) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore project binding |
| `NEXT_PUBLIC_SITE_URL` | Canonical storefront URL |
| `STRIPE_SECRET_KEY` | `sk_live_…` or `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` — webhook signature verification |
| `SYSTEM_JOB_TOKEN` | Bearer auth for cleanup cron (32+ chars) |

**Must not be set in production:**

| Variable | Why |
| --- | --- |
| `ALLOW_PRODUCTION_SEEDING=true` | Data wipe risk |

Stripe webhook secret is required separately from the API key — missing `STRIPE_WEBHOOK_SECRET` degrades checkout/refund health even when `STRIPE_SECRET_KEY` is present.

---

## Protocol health endpoint

```bash
curl -sS "https://YOUR_DOMAIN/api/system/health/protocols"
```

Response shape:

```ts
{
  ok: boolean;
  checks: {
    checkout: HealthCheck;
    refunds: HealthCheck;
    inventory: HealthCheck;
    admin: HealthCheck;
    crm: HealthCheck;
    support: HealthCheck;
    commerceEvents: HealthCheck;
    stripe: HealthCheck;
    firestore: HealthCheck;
  };
  env: { ok: boolean; issueCount: number };
}
```

`HealthCheck`: `{ ok, status: 'ok' | 'degraded' | 'failed', message?, latencyMs? }`

**Never exposes secret values** — only booleans, statuses, and issue variable names.

### What each check means

| Check | Pass criteria |
| --- | --- |
| `stripe` | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` present and formatted |
| `firestore` | Credentials present + `commerce_events` read probe |
| `commerceEvents` | Append + read smoke test on `commerce_events` |
| `checkout` | Checkout protocol wired; Stripe healthy |
| `refunds` | Refund protocol wired; Stripe healthy |
| `inventory` | Inventory protocol wired; Firestore healthy |
| `admin` | Admin protocol wired |
| `crm` | CRM protocol wired |
| `support` | Support protocol wired |

Schedule this endpoint from your monitor (every 1–5 min). Alert on `ok: false` or HTTP 503.

---

## Deploy checklist

- [ ] `npm run typecheck && npm run lint && npm test` pass
- [ ] `npm run test:storefront-release` passes
- [ ] `npm test -- --run src/tests/protocol-guard.test.ts`
- [ ] `npm test -- --run src/tests/production-readiness.test.ts`
- [ ] `npm run test:e2e:checkout-smoke` passes (checkout UI releases)
- [ ] `npm run test:e2e:cart-smoke` passes (cart UI/protocol releases)
- [ ] Production env vars set ([environment-variables.md](./environment-variables.md))
- [ ] `ALLOW_PRODUCTION_SEEDING=false`
- [ ] Live Stripe webhook → `https://YOUR_DOMAIN/api/webhooks/stripe`
- [ ] `GET /api/system/health/protocols` returns `ok: true`
- [ ] Firestore rules + indexes deployed
- [ ] `SYSTEM_JOB_TOKEN` set; cleanup cron scheduled ([runbook.md § Cleanup jobs](./runbook.md#cleanup-jobs))
- [ ] Demo credentials rotated
- [ ] `SESSION_SECRET` unique to production

Full deploy steps: [deployment.md](./deployment.md)

---

## Rollback checklist

1. **Hosting:** Firebase Console → Hosting → Release history → Roll back to previous release  
   Or CLI: `firebase hosting:clone SOURCE:CHANNEL TARGET:live`
2. **Application:** Revert git commit and redeploy previous artifact
3. **Do not** roll back Firestore data without a backup export plan
4. **Verify:** `GET /api/system/health/protocols` → `ok: true`
5. **Spot-check:** Admin login, one read-only order, Stripe webhook test event
6. **Incidents:** If rollback was triggered by checkout/refund/inventory failure, follow [commerce-incident-runbook.md](./commerce-incident-runbook.md) before re-deploying the failed build

---

## Structured log keys

Use these keys in log queries (Datadog, Cloud Logging, etc.). Values are masked for `password`, `token`, `secret`, `key`, `email`, `card`, `stripe` fields.

| Key / prefix | When |
| --- | --- |
| `protocol.health.report` | Protocol health summary (`ok`, `degraded` check names) |
| `protocol.health.firestore_failed` | Firestore read probe failed |
| `protocol.health.commerce_events_failed` | Event store smoke test failed |
| `[CHECKOUT-WORKFLOW]` | Checkout phase transitions |
| `checkout_finalize_tx_*` | Payment finalization early exits |
| `inventory.reserved` / `inventory.committed` | Commerce events (in `commerce_events`, not always logs) |
| `system_cleanup_completed` | Cleanup job finished |
| `FATAL:` | Operator-action required failures |
| `CRITICAL:` | Lock / infrastructure failures |

Commerce timeline debugging: `correlationId` = `order:{orderId}` across events.

---

## Verification

```bash
npm test -- --run src/tests/production-readiness.test.ts
curl -sS http://localhost:3000/api/system/health/protocols | jq .
```

---

## Incident response

Production failures by protocol: **[commerce-incident-runbook.md](./commerce-incident-runbook.md)**

Daily cadence: **[runbook.md](./runbook.md)**
