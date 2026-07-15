# Deployment

Production deployment guide for MeowAcc — self-hosted on **Firebase Hosting** (SSR) with **Firestore**, **Firebase Auth**, and **Stripe**.

Prerequisites: completed [onboarding.md](./onboarding.md) locally. Production gate: [production-readiness.md](./production-readiness.md).

---

## Overview

```text
Git push / CI
  → npm run build:deploy (FIREBASE_DEPLOY=1)
  → firebase deploy --only hosting
  → Next.js SSR on Cloud Functions / Cloud Run (project scripts configure scaling)
  → Firestore + Firebase Auth + Stripe (external)
```

Deploy script: `scripts/deploy-optimized.sh` · `npm run deploy`

---

## Pre-deploy checklist

- [ ] `npm run typecheck` && `npm run lint` && `npm test` pass
- [ ] `npm run build` or `npm run build:deploy` succeeds
- [ ] Production Firebase project (separate from dev recommended)
- [ ] Firestore rules deployed and tested (`firestore-security.test.ts`)
- [ ] Production Stripe account in **live** mode keys
- [ ] Live webhook endpoint registered in Stripe Dashboard
- [ ] `ALLOW_PRODUCTION_SEEDING=false`
- [ ] `SESSION_SECRET` — unique 32+ char secret (never dev default)
- [ ] Demo credentials rotated — no `admin-password-123` in prod
- [ ] WoodBine demo branding replaced ([day-2.md § Rebrand](./day-2.md))
- [ ] `SYSTEM_JOB_TOKEN` set for scheduled cleanup jobs
- [ ] HTTPS enforced (Firebase Hosting default)

---

## Environment variables (production)

Set in Firebase / hosting secret manager — not in client bundles for server secrets.

### Required

| Variable | Notes |
| --- | --- |
| `SESSION_SECRET` | Production-only random secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK |
| `NEXT_PUBLIC_FIREBASE_*` | Client config (public by design) |
| `NEXT_PUBLIC_SITE_URL` | Production canonical URL (`https://yourstore.com`) |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard webhook endpoint |

### Recommended

| Variable | Notes |
| --- | --- |
| `SYSTEM_JOB_TOKEN` | Bearer auth for `/api/system/cleanup-*` |
| `BREVO_*` | Transactional email |
| `NEXT_PUBLIC_BUSINESS_*` | Local SEO schema |

### Never in production

| Variable | Why |
| --- | --- |
| `ALLOW_PRODUCTION_SEEDING=true` | Data wipe risk |
| Test Stripe keys mixed with live | Payment failures / wrong account |
| Committed `.env` with real secrets | Credential leak |

Security detail: [security.md](./security.md)

---

## Stripe production webhooks

Unlike local dev (`stripe listen`), production uses a **registered endpoint**:

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
3. Events (minimum): `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in hosting env
5. Send test event from Dashboard → verify order finalization in Firestore

Missing or wrong webhook secret = **paid Stripe charges with pending local orders**. See [troubleshooting.md § Webhooks](./troubleshooting.md#webhooks--finalization).

---

## Build and deploy

```bash
# Local production build test
npm run build:deploy

# Full deploy (project script)
npm run deploy
```

What `deploy-optimized.sh` does:

1. Patches Next for Turbopack production build
2. `firebase deploy --only hosting` with `FIREBASE_DEPLOY=1`
3. Strips local deploy artifacts
4. Runs SSR helpers (`ensure-ssr-public-access`, memory, scaling)

Verify after deploy:

- `GET /api/system/health/protocols` returns `ok: true`
- Storefront loads at production URL
- Login/register works (Firebase Auth)
- Test checkout with live **test mode** keys first if validating pipeline before going live
- Admin `/admin` accessible with production admin user

---

## Scheduled jobs (production ops)

Background maintenance — not triggered automatically unless you schedule them.

| Job | Route | Auth |
| --- | --- | --- |
| Order + reservation cleanup | `POST /api/system/cleanup-orders` | `Authorization: Bearer $SYSTEM_JOB_TOKEN` |
| Reservation-only cleanup | `POST /api/system/cleanup-inventory` | Same bearer |

`cleanup-orders` runs:

- `checkout.cleanupExpiredPendingOrders({ maxAgeMinutes: 60 })`
- `inventory.cleanupExpiredReservations({ limit: 100 })`

Schedule via Cloud Scheduler, cron, or external monitor — **daily minimum** for active stores.

Full ops guide: [runbook.md](./runbook.md)

---

## Firestore

- **Rules:** Deploy from your project's rules file; align with `src/tests/firestore-security.test.ts`
- **Indexes:** Create composite indexes when Firestore console prompts after first query errors
- **Backups:** Enable Firestore scheduled exports for production (Google Cloud Console)
- **Multi-env:** Use separate Firebase projects for dev/staging/prod

Collection reference: [data-model.md](./data-model.md)

---

## Rollback

Firebase Hosting:

```bash
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL TARGET_SITE_ID:live
# or rollback via Firebase Console → Hosting → Release history
```

Application rollback:

1. Revert git commit
2. Redeploy previous release
3. **Do not** rollback Firestore data without a backup plan — orders/refunds are forward-only

---

## Post-deploy monitoring

| Signal | Where to look |
| --- | --- |
| Stuck pending orders | Admin orders filter; reconciliation cases |
| Webhook failures | Stripe Dashboard → Webhooks → event log |
| Cleanup job failures | HTTP 207 responses; `system_cleanup_completed` logs |
| Stock drift | Admin inventory reconcile |
| Auth issues | Firebase Auth console |

Runbook: [runbook.md](./runbook.md) · Debug: [troubleshooting.md](./troubleshooting.md)

---

## Related

- [getting-started.md](./getting-started.md) — local env reference
- [day-2.md § Production prep](./day-2.md#production-prep-checklist)
- [security.md](./security.md)
