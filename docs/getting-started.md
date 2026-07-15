# Getting Started

Technical setup reference for running MeowAcc locally. For a guided **day-0 walkthrough** (checklists, first purchase, learning path), start with **[onboarding.md](./onboarding.md)**.

---

## Prerequisites

| Requirement | Version / notes |
| --- | --- |
| Node.js | 22.x recommended (`package.json` engines); setup script requires ≥ 20 |
| npm | Bundled with Node |
| Firebase project | Authentication + Firestore enabled |
| Stripe account | Test mode keys for local dev |
| Stripe CLI | Required for local webhook delivery |
| OS | macOS, Linux, or WSL2 |

Optional: Brevo (email), Gemini (Concierge), Firebase Storage (media uploads).

---

## Install

```bash
git clone <your-fork-url>
cd MeowAcc
npm run setup
npm run dev
```

### What `npm run setup` does

From `scripts/setup.sh`:

1. Verifies Node version
2. Copies `.env.example` → `.env` if missing
3. Generates random `SESSION_SECRET` (replaces placeholder)
4. Runs `npm install`
5. Seeds Firestore via `src/infrastructure/services/SeedDataLoader.ts`

Seed creates sample catalog, inventory (protocol-safe), and a dev admin user. Re-running setup re-seeds — use caution if you rely on local data persistence.

---

## Environment variables

Copy `.env.example` to `.env`. **Canonical reference:** [environment-variables.md](./environment-variables.md)

Summary by concern:

### Security (required)

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | 32+ char HMAC secret for signed cookies |
| `ALLOW_PRODUCTION_SEEDING` | Must be `false` in production |

### Firebase (required)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client SDK |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage (optional media) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client config |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK credentials (server) |

### Stripe (required for checkout)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js on storefront |
| `STRIPE_SECRET_KEY` | Server PaymentIntent API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |

### Site & SEO

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL |
| `NEXT_PUBLIC_BUSINESS_*` | Local business schema (address, hours, geo) |

Replace WoodBine demo values with your merchant.

### Optional integrations

| Variable | Purpose |
| --- | --- |
| `BREVO_API_KEY`, `BREVO_FROM_*` | Transactional email |
| `GEMINI_API_KEY` | Concierge LLM |
| `HERMES_*` | Alternate Concierge agent endpoint |

**Never commit live secrets.**

---

## Firebase setup (step-by-step)

1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. **Build → Authentication → Sign-in method** → Enable Email/Password
3. **Build → Firestore Database → Create database**
4. **Project settings → General → Your apps → Web** → Register app → copy config to `NEXT_PUBLIC_FIREBASE_*`
5. **Project settings → Service accounts → Generate new private key** → set `FIREBASE_SERVICE_ACCOUNT_JSON`

Apply Firestore security rules from your deployment workflow. Expected rule behavior is covered in `src/tests/firestore-security.test.ts`.

---

## Stripe setup (step-by-step)

1. Dashboard → **Developers → API keys** (Test mode)
2. Copy keys to `.env`
3. In a **second terminal**, forward webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the displayed `whsec_…` → `STRIPE_WEBHOOK_SECRET`
5. Restart `npm run dev`

**Test card:** `4242 4242 4242 4242` · any future expiry · any CVC.

Without webhook forwarding, Stripe may show payment succeeded while the local order stays **pending**.

---

## Verify installation

### Manual smoke test

| Step | URL / action | Expected |
| --- | --- | --- |
| 1 | `/collections/bestsellers` | Seeded products visible (`/products` redirects here) |
| 2 | Add to cart → checkout | Payment form loads |
| 3 | Pay with test card | Success / order confirmation |
| 4 | `/orders` | Order listed as paid/processing |
| 5 | `/login` as admin | See [onboarding.md § credentials](./onboarding.md#default-dev-credentials) |
| 6 | `/admin/orders` | Same order visible |

### Automated verification

```bash
# Types and lint
npm run typecheck
npm run lint

# Full test suite
npm test

# Storefront frozen chain (cart, checkout, catalog, PDP, inventory holds, payment)
npm run test:storefront-release

# Commerce protocol seals (fast confidence check)
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts

# Production build
npm run build

# Browser e2e
npm run test:e2e:cart-smoke       # isolated cart-to-checkout smoke
npm run test:e2e:checkout-smoke   # isolated checkout smoke
npm run test:e2e                  # full Playwright suite

# Core throughput baseline
npm run benchmark:order-flow
```

---

## Deploy

```bash
npm run build:deploy   # FIREBASE_DEPLOY=1
npm run deploy         # scripts/deploy-optimized.sh
```

Default scripts target Firebase Hosting. Any Node 22 host running `next start` after `next build` works with correct env vars.

Pre-deploy checklist:

- [ ] `ALLOW_PRODUCTION_SEEDING=false`
- [ ] Production Stripe keys + live webhook endpoint registered in Stripe Dashboard
- [ ] `SESSION_SECRET` rotated from dev default
- [ ] Firebase rules deployed
- [ ] `npm test` and `npm run build` pass in CI

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Firebase `permission-denied` | Service account JSON, project id match |
| Checkout 503 `STRIPE_NOT_CONFIGURED` | Stripe keys in `.env`, server restart |
| Order pending after payment | `stripe listen` running, webhook secret matches |
| Admin 403 | Admin role on user document in Firestore |
| Inventory adjust rejected | Use `/admin/inventory` batch, not product PATCH |
| Empty catalog after setup | Seed errors in terminal; Firebase connectivity |

Guided troubleshooting: [onboarding.md § Troubleshooting](./onboarding.md#troubleshooting-first-hour)  
**Full guide:** [troubleshooting.md](./troubleshooting.md)  
Extended wiki: [.wiki/onboarding/troubleshooting.md](../.wiki/onboarding/troubleshooting.md)

---

## Next steps

| Goal | Document |
| --- | --- |
| Guided onboarding | [onboarding.md](./onboarding.md) |
| After day 0 | [day-2.md](./day-2.md) |
| How flows connect | [flows.md](./flows.md) |
| System design | [architecture.md](./architecture.md) |
| Debug issues | [troubleshooting.md](./troubleshooting.md) |
| Extend safely | [contributing-commerce.md](./contributing-commerce.md) |
| Storefront | [storefront.md](./storefront.md) |
| Admin console | [admin.md](./admin.md) |
