# Troubleshooting

Symptom-first guide for local development and production operations. For setup order, see [onboarding.md](./onboarding.md). For flow context, see [flows.md](./flows.md).

---

## Quick diagnosis

```text
What broke?
├── Can't start app          → § Environment & boot
├── Empty store / no login   → § Firebase & seed
├── Checkout won't load      → § Stripe configuration
├── Payment ok, order pending → § Webhooks & finalization
├── Stock wrong              → § Inventory
├── Refund failed            → § Refunds
├── Admin blocked            → § Auth & roles
└── Tests failing            → § Verification
```

---

## Environment & boot

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Node version` error on setup | Node < 20 | Install Node 22 (`nvm install 22`) |
| `.env` missing vars | Incomplete copy from example | `cp .env.example .env`; fill Firebase + Stripe |
| Changes to `.env` ignored | Server not restarted | Stop and re-run `npm run dev` |
| Port already in use | Previous dev server | `npm run cleanup` or kill process on 3000 |

---

## Firebase & seed

| Symptom | Cause | Fix |
| --- | --- | --- |
| `permission-denied` in console | Wrong project or missing service account | Verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches Firestore project; set `FIREBASE_SERVICE_ACCOUNT_JSON` |
| Empty `/products` after setup | Seed failed silently | Re-run `npm run setup`; check terminal for SeedDataLoader errors |
| Login works but no admin | User missing `role: admin` | Firestore `users` doc — set role; or use seeded `admin@woodbine.com` |
| Auth `invalid-api-key` | Mismatch web config | Re-copy Firebase web app config to all `NEXT_PUBLIC_FIREBASE_*` |

Default dev admin: [onboarding.md § credentials](./onboarding.md#default-dev-credentials)

---

## Stripe configuration

| Symptom | Cause | Fix |
| --- | --- | --- |
| Checkout 503 `STRIPE_NOT_CONFIGURED` | Missing keys | Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Stripe.js fails to load | Bad publishable key or adblock | Test key format `pk_test_…`; disable blockers |
| Card form shows, submit hangs | Network or CORS to Stripe | Check browser network tab; verify test mode |

---

## Webhooks & finalization

**Most common production-local issue:** payment succeeds in Stripe Dashboard but order stays **pending**.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Order pending after successful payment | Webhook not delivered | Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Webhook 400 invalid signature | Wrong `STRIPE_WEBHOOK_SECRET` | Copy secret from `stripe listen` output (changes each session) |
| Webhook 503 retry | Concurrent processing | Stripe retries automatically — usually resolves |
| Success page shows error but order paid | Verify race | Refresh orders; check webhook logs; may need reconciliation |
| Duplicate finalization concern | Both webhook + verify fired | By design idempotent — check order paid once, stock committed once |

**Verify manually:**

```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Then complete test checkout with `4242 4242 4242 4242`.

Deep dive: [checkout.md § When things go wrong](./checkout.md#when-things-go-wrong)

---

## Reconciliation

| Symptom | Cause | Operator action |
| --- | --- | --- |
| Case `paid_not_finalized` | Finalization crash or webhook gap | Admin → reconciliation → `retry_recovery` with reason |
| Case `paid_cancelled` | Payment after local cancel | Manual review — do not auto-refund |
| Case `mapping_mismatch` | PI metadata wrong order | Forensic timeline → correct mapping |
| Cleanup job HTTP 207 | Partial failures in batch | Read `errors[]` in cleanup report per orderId |

Narrative: [flows.md § Reconciliation](./flows.md#reconciliation-flow-payment-mismatch)

---

## Inventory

| Symptom | Cause | Fix |
| --- | --- | --- |
| Can't add to cart — out of stock | Zero catalog stock | Admin inventory batch adjust or PO receive |
| Stock sold but shows available | Stale cache / bypass attempt | Never PATCH `stock` on product — use inventory batch |
| PO receive failed 503 | Location fan-out error | Retry with same idempotency key; check location exists |
| Ledger vs stock mismatch | Manual DB edit or bug | `POST /api/admin/inventory/reconcile` |
| Double receive | Different idempotency keys | Same receive action must reuse key for safe retry |

Protocol: [inventory.md](./inventory.md)

---

## Refunds

| Symptom | Cause | Fix |
| --- | --- | --- |
| Admin refund 403 | Not elevated | Re-auth step-up; confirm elevated admin session |
| Refund 400 validation | Missing reason or key | Send `reason` + `idempotencyKey` in request body |
| Concierge refund failed | Over limit or guest user | Customer must login; amount ≤ concierge cap |
| Duplicate refund concern | Retry same key | Safe — returns `duplicate: true`, no double Stripe refund |
| Refund ok but stock wrong | Restock policy | RefundService restock path uses inventory deltas |

Protocol: [refunds.md](./refunds.md)

---

## Auth & roles

| Symptom | Cause | Fix |
| --- | --- | --- |
| Admin 403 on `/admin` | Customer session or missing role | Login as admin user |
| Mutations 403 origin | CSRF guard | Call API from same origin with credentials |
| Session lost on refresh | Cookie / SECRET issue | Stable `SESSION_SECRET`; check HTTP-only cookie in dev |
| Step-up required | High-value checkout or sensitive op | Complete step-up flow in UI |

---

## Concierge

| Symptom | Cause | Fix |
| --- | --- | --- |
| Chat no response | Missing `GEMINI_API_KEY` | Set key or expect degraded mode |
| Tool not executed | validateToolCall blocked | Session policy — check concierge session context |
| Wrong order in tool | LLM hallucination | Grounding + operator review in admin workspace |

---

## Build & deploy

| Symptom | Cause | Fix |
| --- | --- | --- |
| `npm run build` fails | Type or import error | `npm run typecheck` first |
| Production checkout broken | Live keys + webhook URL | Register production webhook in Stripe Dashboard pointing to `/api/webhooks/stripe` |
| Accidental data wipe | Seeding in prod | `ALLOW_PRODUCTION_SEEDING=false` always in prod |

---

## Verification

When unsure what regressed:

```bash
# Fast protocol confidence
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts

# Full suite
npm test

# Single failing area
npm test -- --run src/tests/checkout-webhook-ingress.test.ts
```

| Failure location | Likely layer |
| --- | --- |
| `*-verification-ladder` | Protocol boundary regression |
| `webhook*.test` | Stripe ingress / dedup |
| `firestore-security` | Rules mismatch |
| `e2e/*` | Full stack / UI regression |

---

## Still stuck?

1. Note `orderId`, `paymentIntentId`, or `caseId` from logs
2. Check admin order forensic timeline (read routes)
3. Search codebase for the error `code` from API response
4. Read the relevant protocol doc section linked above

Wiki: [.wiki/onboarding/troubleshooting.md](../.wiki/onboarding/troubleshooting.md)
