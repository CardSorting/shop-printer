# Architectural Overview

WoodBine is engineered with a strict layered architecture so every major behavior has a deterministic home. The project is a Firestore-backed platform for WoodBine food hall operations—vendor menus, ordering, customer support, events, and merchant administration.

See [Project State](./project-state.md) for the current file-level implementation snapshot.

## The Joy-Zoning Layers

| Layer | Responsibility | Constraints |
| :--- | :--- | :--- |
| **Domain** | Business models, pure rules, and repository contracts. | **No I/O.** No Next.js, no DB, no Fetch, no Cookies. |
| **Core** | Service orchestration and business workflow coordination. | **No low-level mechanics.** Delegates to injected adapters. |
| **Infrastructure** | Concrete adapters for DB, Auth, Payments, and HTTP routes. | **Implementation details.** Translates between HTTP/DB and Core. |
| **UI** | Presentation, client-side state, and user interaction. | **No direct Infra access.** Communicates via Core services or API. |

## Current Implementation Snapshot

| Surface | Current state |
| :--- | :--- |
| Storefront | 59 App Router page files, covering home, products, collections, search, cart, checkout, account, orders, wishlist, support, blog, and digital vault. |
| API | 136 route files under `src/app/api`, covering public storefront, auth, checkout, orders, admin, support, concierge, marketing, downloads, webhooks, and system cleanup. |
| Persistence | Firestore repositories implement product, cart, order, discount, settings, inventory, purchase order, supplier, support, campaign, wishlist, and digital access contracts. |
| Tests | 45 test/spec files across Vitest and Playwright. |
| Benchmarking | `npm run benchmark:order-flow` records Core cart, checkout, and order-flow throughput. |

## Request Lifecycle

The request lifecycle is designed to be deterministic and forensic-ready.

1. **Transport**: A request hits a Next.js App Router route (`src/app/api/...`).
2. **Guards**: The route immediately applies security guards (session, role, rate-limiting) from `src/infrastructure/server/apiGuards.ts`.
3. **Parsing**: Request bodies are parsed and validated against Domain-aligned contracts.
4. **Orchestration**: The route delegates to a Core service retrieved from the `getInitialServices()` container.
5. **Persistence**: The service coordinates Domain rules and persists changes via an Infrastructure repository.
6. **Response**: Results are returned as JSON, with errors mapped to appropriate HTTP status codes via `jsonError()`.

## Core Philosophy: Operational Sovereignty

- **Data Ownership**: All transactional and customer data is stored in a sovereign Firestore database, ensuring full privacy and cloud-native scalability.
- **Recoverable Checkout**: Payment and order state are explicit, idempotent, and reconciliation-aware.
- **Operator Reality**: Admin workflows are designed around daily merchant jobs such as receiving stock, resolving orders, answering support, and auditing risky changes.
- **API-Backed Admin**: Admin screens are backed by API routes and Core services, which keeps UI behavior traceable to server-side contracts.
