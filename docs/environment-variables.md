# Environment Variables

Complete reference for DreamBees Art configuration. Template: `.env.example` at repo root.

**Setup walkthrough:** [getting-started.md](./getting-started.md) · **Production:** [deployment.md](./deployment.md)

---

## How env is loaded

| Context | Source |
| --- | --- |
| Local dev | `.env` (created by `npm run setup` from `.env.example`) |
| Next.js client | `NEXT_PUBLIC_*` only — embedded in browser bundle |
| Next.js server | All vars available in API routes and SSR |
| Production | Firebase/hosting secret config or CI — never commit live values |

Restart `npm run dev` after changing server-side variables.

---

## Required (local commerce)

### Security

| Variable | Example | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | 32+ random chars | HMAC signing for HTTP-only session cookies |

### Firebase — client (public)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web SDK |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App id |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics (optional) |

### Firebase — server (secret)

| Variable | Purpose |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK JSON string for Firestore/Auth server ops |

Without this, API routes cannot persist orders or read admin data.

### Stripe

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` for Stripe.js |
| `STRIPE_SECRET_KEY` | Server PaymentIntent and refund API |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Stripe CLI or Dashboard webhook |

---

## Site & SEO (public)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for links and meta |
| `NEXT_PUBLIC_BUSINESS_STREET` | LocalBusiness schema |
| `NEXT_PUBLIC_BUSINESS_CITY` | |
| `NEXT_PUBLIC_BUSINESS_REGION` | State/province |
| `NEXT_PUBLIC_BUSINESS_NEIGHBORHOOD` | Optional |
| `NEXT_PUBLIC_BUSINESS_POSTAL` | |
| `NEXT_PUBLIC_BUSINESS_LAT` | Geo latitude |
| `NEXT_PUBLIC_BUSINESS_LNG` | Geo longitude |
| `NEXT_PUBLIC_BUSINESS_PHONE` | |
| `NEXT_PUBLIC_BUSINESS_OPENS` | Hours open (e.g. `11:00`) |
| `NEXT_PUBLIC_BUSINESS_CLOSES` | Hours close |

Replace WoodBine demo values for your merchant. See [customization.md](./customization.md).

---

## Production & ops (secret)

| Variable | Purpose |
| --- | --- |
| `SYSTEM_JOB_TOKEN` | Bearer token for `POST /api/system/cleanup-orders` and `cleanup-inventory` |
| `ALLOW_PRODUCTION_SEEDING` | Must be `false` in production — prevents destructive seed |

Generate `SYSTEM_JOB_TOKEN`:

```bash
openssl rand -base64 32
```

Use in cron:

```bash
curl -X POST "$SITE/api/system/cleanup-orders" \
  -H "Authorization: Bearer $SYSTEM_JOB_TOKEN"
```

Detail: [runbook.md](./runbook.md)

---

## Optional integrations

### Email (Brevo)

| Variable | Purpose |
| --- | --- |
| `BREVO_API_KEY` | Transactional email API |
| `BREVO_FROM_EMAIL` | From address |
| `BREVO_FROM_NAME` | From display name |

### Concierge AI

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini for chat |
| `HERMES_API_BASE_URL` | Optional alternate agent (default local Hermes) |
| `HERMES_API_KEY` | Agent auth |
| `HERMES_MODEL` | Model name |

Commerce works without AI keys; Concierge degrades gracefully.

### Checkout

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_E2E_MOCK_CHECKOUT` | Set to `1` for E2E only — shows **Mock Pay (E2E)** in `StripeCheckoutForm`. Set by `npm run dev:e2e` and `scripts/run-checkout-smoke.sh`. **Never enable in production.** |

### Build / deploy

| Variable | Purpose |
| --- | --- |
| `FIREBASE_DEPLOY=1` | Set by `npm run build:deploy` for hosting builds |
| `NEXT_TELEMETRY_DISABLED=1` | Disable Next telemetry (scripts set this) |

---

## Legacy / seed tooling

| Variable | Notes |
| --- | --- |
| `SQLITE_DATABASE_PATH` | Legacy reference in `.env.example` — runtime commerce uses **Firestore** |

Do not point production at SQLite; ignore unless working on legacy seed scripts.

---

## Environment matrix

| Variable | Local dev | Production | Client visible |
| --- | --- | --- | --- |
| `SESSION_SECRET` | Required | Required unique | No |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Required | Required | No |
| `NEXT_PUBLIC_FIREBASE_*` | Required | Required | Yes |
| `STRIPE_SECRET_KEY` | Test key | Live key | No |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` | From Dashboard | No |
| `SYSTEM_JOB_TOKEN` | Optional locally | Required for cron | No |
| `GEMINI_API_KEY` | Optional | Optional | No |
| `ALLOW_PRODUCTION_SEEDING` | `false` | **`false`** | No |

---

## Security rules

- Never commit `.env` with live secrets (use placeholders in `.env.example` only)
- Rotate all secrets if exposed — [security.md](./security.md)
- Do not prefix server secrets with `NEXT_PUBLIC_`

---

## Related

- [security.md](./security.md)
- [deployment.md](./deployment.md)
- [quick-reference.md](./quick-reference.md)
