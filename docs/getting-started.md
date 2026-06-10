# Getting Started

Run DreamBees Art locally as a **self-hosted Shopify-class store**: Next.js app + Firebase + Stripe. This guide covers prerequisites, environment setup, first boot, and verification.

---

## Prerequisites

| Requirement | Version / notes |
| --- | --- |
| Node.js | 22.x (`package.json` engines) |
| npm | Bundled with Node |
| Firebase project | Authentication + Firestore enabled |
| Stripe account | Test mode keys for local dev |
| OS | macOS, Linux, or WSL2 |

Optional:

- **Brevo** — transactional email (password reset, notifications)
- **Gemini / Vertex** — Concierge AI features
- **Firebase Storage** — media uploads in admin

---

## One-command setup

```bash
git clone <your-fork-url>
cd DreamBeesArt
npm run setup
```

`npm run setup` runs `scripts/setup.sh`, which typically:

1. Verifies Node version
2. Copies `.env.example` → `.env` if missing
3. Generates a `SESSION_SECRET` when needed
4. Runs `npm install`
5. Optionally seeds development data when configured

Then start the dev server:

```bash
npm run dev
```

Default dev URL: `http://localhost:3000` (see `scripts/dev.sh` for port behavior).

---

## Environment variables

Copy `.env.example` to `.env` and fill in values.

### Required for commerce

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | 32+ char secret for signed cookies |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js |
| `STRIPE_SECRET_KEY` | Server-side Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase config |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK (server) — JSON string or path |

### Site & SEO

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_BUSINESS_*` | Local business schema (street, city, hours, geo) |

Replace WoodBine defaults with your merchant details.

### Optional

| Variable | Purpose |
| --- | --- |
| `CHECKOUT_ENDPOINT` | Trusted server-side checkout gateway URL |
| `BREVO_API_KEY`, `BREVO_FROM_*` | Email delivery |
| `GEMINI_API_KEY` | Concierge LLM |
| `ALLOW_PRODUCTION_SEEDING` | Must stay `false` in production |

**Never commit live secrets.** Rotate any keys that appear in example files.

---

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication** (email/password and/or Google as configured).
3. Create a **Firestore** database.
4. Download a **service account** key for the Admin SDK → `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Add web app config → `NEXT_PUBLIC_FIREBASE_*` values.

Deploy Firestore security rules from the repo if your workflow includes them (`src/tests/firestore-security.test.ts` documents expected rules behavior).

---

## Stripe setup

1. Create products/prices in Stripe or let checkout create PaymentIntents dynamically.
2. Add test keys to `.env`.
3. For local webhooks, use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Seed data

```bash
npm run seed
```

Runs `migrate-and-seed.ts` with `.env` loaded. Seeding uses Admin SDK paths that mirror inventory protocol semantics (catalog stock via ledger markers, not raw PATCH).

Set `ALLOW_PRODUCTION_SEEDING=false` in every production environment.

---

## First login paths

| Surface | URL |
| --- | --- |
| Storefront | `/` |
| Products | `/products` |
| Admin | `/admin` |
| Register / login | `/register`, `/login` |

Create an admin user through your Firebase Auth + admin bootstrap flow (see `.wiki/admin-access.md`).

---

## Verification checklist

```bash
# Types and lint
npm run typecheck
npm run lint

# Production build
npm run build

# Unit and integration tests
npm test

# Commerce protocol seals
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts

# Browser e2e (requires dev server or webServer config)
npm run test:e2e

# Core throughput baseline
npm run benchmark:order-flow
```

All tests passing locally is the bar before deploying.

---

## Deploy

Production build:

```bash
npm run build:deploy   # FIREBASE_DEPLOY=1
npm run deploy         # scripts/deploy-optimized.sh
```

Hosting targets Firebase by default in project scripts. Any Node 22 host that runs `next start` after `next build` works if Firebase and Stripe env vars are present.

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Checkout 503 `STRIPE_NOT_CONFIGURED` | Stripe keys in `.env`, server restart |
| Webhook duplicates / unpaid orders | Webhook secret, Stripe CLI forward URL |
| Admin 403 | Session cookie, admin role claims |
| Inventory adjust rejected | Use admin inventory API, not product PATCH `stock` |
| Concierge refund fails | Customer logged in, amount within concierge limit |

More: [.wiki/onboarding/troubleshooting.md](../.wiki/onboarding/troubleshooting.md)

---

## Next steps

- [platform-overview.md](./platform-overview.md) — feature map
- [architecture.md](./architecture.md) — layers and protocols
- [storefront.md](./storefront.md) — customer surface
- [admin.md](./admin.md) — merchant console
