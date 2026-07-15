# 🐾 MeowAcc

### *Sovereign ecommerce — Shopify-class surfaces, inspectable commerce internals.*

MeowAcc is an enterprise-ready, open-source merchant operating system designed to run entirely on your own cloud. Storefront, admin panel, checkout pipelines, inventory ledger, support CRM, and digital fulfillment are packed into a single, inspectable Next.js monolith. 

You own the database, the code, the keys, and the cash flow paths — backed by strict, automated mathematical proof gates that maintain architectural integrity as your business scales.

> [!NOTE]
> The default reference deployment uses **WoodBine** demo branding (our sample Salt Lake City food hall). The core engine is completely vertical-neutral. Easily swap out logos, brand details, and theme configurations via admin settings and `src/domain/seo/brand.ts`.

---

## ⚡ The Sovereignty Paradigm

In SaaS ecommerce, you trade independence for speed. MeowAcc inverts the equation, giving you maximum performance without compromising control:

| SaaS Default | MeowAcc |
| :--- | :--- |
| **Platform-Hosted Data** | 🔒 Your own sovereign Google Cloud Firestore project |
| **Opaque Checkout** | 🛠️ Protocol-bound, fully auditable, and recoverable checkout states |
| **Theme & App Limits** | 💻 Unlimited flexibility with a raw TypeScript & React code deck |
| **Subscription Fees** | 💵 Zero platform cut. Pay raw serverless infrastructure costs directly |

> [!TIP]
> Commerce software should be sovereign, inspectable, and provable. Read the deep-dive philosophy guide in [docs/philosophy.md](docs/philosophy.md), browse the executive summary in [docs/brief.md](docs/brief.md), or review the full technical thesis in [docs/whitepaper.md](docs/whitepaper.md).

---

## 🛡️ Strategic Integrity Layers

MeowAcc protects itself from logic degradation through two frozen architectural patterns:

### 1. Protocol Cages (Commerce Mutations)
All financial and inventory state mutations are isolated within four frozen application service boundaries. Direct route handlers or external adapters are physically blocked from raw repositories:

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                        API / Routes                         │
  └──────────────┬──────────────────────────────┬───────────────┘
                 │                              │
                 ▼                              ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │    services.checkout    │    │    services.inventory   │
    │     (Money Capture)     │    │    (Stock Movement)     │
    └─────────────────────────┘    └─────────────────────────┘
                 │                              │
                 ▼                              ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │     services.refunds    │    │      services.admin     │
    │     (Money Reversals)   │    │    (Human Authority)    │
    └─────────────────────────┘    └─────────────────────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 Infrastructure / Database                   │
  └─────────────────────────────────────────────────────────────┘
```
> [!IMPORTANT]
> No raw route, automation, or LLM agent is permitted to touch mutation layers without passing through this service container.

### 2. Frozen Storefront Lanes (The Customer Journey)
The storefront lifecycle is treated as a linear assembly line. Each transition is locked behind strict view-state and protocol validation tests:

$$\text{Catalog/PDP (Read Intent)} \longrightarrow \text{Cart (Buffer)} \longrightarrow \text{Checkout (Commitment Gate)} \longrightarrow \text{Inventory Holds (Scarcity)} \longrightarrow \text{Payment Capture (Money)}$$

- The cart **never** reserves stock.
- The checkout **never** skips revalidation.
- The browser UI only tokenizes; the server controls the capture.

To prove the entire chain is green:
```bash
npm run test:storefront-release   # Runs the storefront release proof suite
npm run test:e2e:cart-smoke       # Proves isolated guest/auth cart journeys
npm run test:e2e:checkout-smoke   # Proves checkout session flows
```
*Read more: [docs/storefront-release.md](docs/storefront-release.md) & [docs/commerce-protocol-frozen.md](docs/commerce-protocol-frozen.md)*

---

## 📦 What is Included

| Module | Capabilities |
| :--- | :--- |
| **🏪 Storefront** | Collections, Product Detail Pages (PDP), search, responsive cart drawer, checkout, client account center, order history, wishlist, support board, content blog, and a secure customer digital asset locker (Vault) |
| **💼 Admin Workspace** | Real-time sales telemetry, order fulfillments, product metadata catalog, visual bulk editor, inventory controls, purchase orders, supplier management, discount engines, local SEO hub, support ticket queue |
| **⚙️ Transaction Core** | Fully idempotent checkout steps, multi-currency processing, automatic stock reserve-hold lifecycle, refund calculations, transaction reconciliation, and a centralized audit trail |
| **🧠 Intelligent Support** | Multi-channel ticketing, canned replies (macros), agent collision tracking, and an integrated AI support agent (Concierge) constrained by standard safety protocols |
| **🔌 Integrations** | Stripe payment processing, Firebase Auth + Cloud Firestore, Brevo transactional mailing, optional Vertex AI / Gemini models |

---

## 🏗️ Technical Architecture

MeowAcc is written as a clean-architecture TypeScript monolith on the Next.js App Router:

```text
  [ UI Surface (React + CSS) ]
             │
             ▼
  [ App Router (HTTP Pages + APIs) ]
             │
             ▼
  [ Core (Application Protocols & Orchestration) ]
             │
             ├──────────────────────────────────────┐
             ▼                                      ▼
  [ Domain (Pure Business Rules) ]    [ Infrastructure (Firestore / Stripe / Guards) ]
```

- **Domain (`src/domain/`)**: Pure business logic, entity models, and interface definitions. Standard zero-dependency layer.
- **Core (`src/core/`)**: Transaction workflows, orchestrations, and use-cases.
- **Infrastructure (`src/infrastructure/`)**: Third-party integrations, database adapters, and authentication bindings.
- **UI (`src/ui/`)**: User interface components, views, layouts, and pages.

*Detailed Guide: [docs/architecture.md](docs/architecture.md) | Flow Diagrams: [docs/flows.md](docs/flows.md)*

---

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js 22** or higher
- **Firebase Project** (Auth, Firestore, and Local Emulators)
- **Stripe Account** (Developer keys)
- Configure your environment variables by copying `.env.example` to `.env`.

### 🛠️ Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run the onboarding and setup wizard
npm run setup

# 3. Start the Next.js dev server & Firebase emulators
npm run dev
```

### 🧪 Pre-Flight Checks
Validate that your branch is healthy before pushing to production:
```bash
npm run lint                 # Lint code using ESLint
npm run typecheck            # Run TypeScript compilations
npm run test                 # Run core service unit tests
npm run test:storefront-release  # Execute frozen release gates
npm run test:e2e             # Execute full Playwright E2E suite
npm run benchmark:order-flow  # Run concurrency throughput benchmarks
```

*For step-by-step setup guides, read [docs/onboarding.md](docs/onboarding.md) or [docs/getting-started.md](docs/getting-started.md).*

---

## 📖 Document Directory

### 🗺️ Context & Strategy
- [brief.md](docs/brief.md) — 2-minute overview of the project.
- [philosophy.md](docs/philosophy.md) — The rationale behind the sovereign engine design.
- [whitepaper.md](docs/whitepaper.md) — Exhaustive system paper.
- [platform-overview.md](docs/platform-overview.md) — Shopify mapping and feature statuses.

### 🔌 Setup & Ops
- [onboarding.md](docs/onboarding.md) — Day-0 installation checklist.
- [local-development.md](docs/local-development.md) — Local testing and seed guides.
- [environment-variables.md](docs/environment-variables.md) — Environment keys index.
- [quick-reference.md](docs/quick-reference.md) — Cheat sheet for commands and script targets.
- [runbook.md](docs/runbook.md) — Operator troubleshooting and incident runbooks.

### 📐 Engineering Specifications
- [architecture.md](docs/architecture.md) — Deep dive into the four layers.
- [storefront-release.md](docs/storefront-release.md) — Static checks and release proof system.
- [checkout.md](docs/checkout.md) — Atomic order processing and reconciliation states.
- [inventory.md](docs/inventory.md) — Double-entry inventory allocation guidelines.
- [refunds.md](docs/refunds.md) — Refund rules.
- [glossary.md](docs/glossary.md) — Common terminology definitions.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Runtime:** Node.js 22 (V8 Engine)
- **Styling:** Tailwind CSS 4
- **Database / Auth:** Google Cloud Firestore & Firebase Auth
- **Payments:** Stripe API (Stripe.js V3 client + Stripe Node V17)
- **Tests:** Vitest & Playwright E2E
- **AI Core:** Gemini Pro API / Vertex AI SDK

---

## 📊 Repository Snapshot
- **API Interfaces:** 150 route boundaries
- **App Router Views:** 71 pages
- **Test Integrity:** 103 test files (134 total specs passing)
- **Service Registration:** Centralized lazy container at `src/core/container.ts`

---

## 🤝 Contributing

We welcome contributions to MeowAcc! Before writing code, review [CONTRIBUTING.md](CONTRIBUTING.md). For protocol-level state alterations, read the validation checklist at [docs/contributing-commerce.md](docs/contributing-commerce.md).

---

## 📄 License

Sovereign commerce platform distributed under the **MIT License**. Copyright © 2026 [William Cruz](LICENSE). See the [LICENSE](LICENSE) file for conditions.
