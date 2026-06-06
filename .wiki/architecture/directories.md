# Directory Dictionary

This document maps the WoodBine workspace and defines the structural constraints for each directory.

## Root Directory

| Path | Purpose |
| :--- | :--- |
| `/src` | All application source code. |
| `/.wiki` | The Knowledge Ledger (Documentation). |
| `/docs` | Long-form technical documentation and whitepapers. |
| `/public` | Static assets (images, fonts). |
| `/e2e` | Playwright end-to-end tests. |
| `/scripts` | Operational and onboarding scripts. |

## Source Directory (`/src`)

### `/domain`
The "Brain" of the application.
- **`models.ts`**: Strict TypeScript interfaces for all entities.
- **`repositories.ts`**: Interface contracts for all I/O operations.
- **`rules.ts`**: Pure functions for validation, calculations, and business logic.
- **`errors.ts`**: Centralized domain error taxonomy.

### `/core`
The application orchestration layer.
- **`OrderService.ts`**: Compatibility facade for checkout, order reads, logistics, fulfillment workflow, and admin order mutations.
- **`order/`**: Split order sub-services for checkout, admin reconciliation, logistics, reads, fulfillment workflow, and forensics.
- **`marketing/`**: Lifecycle campaign strategy, intelligence, personalization, and delivery orchestration.
- **`container.ts`**: Firestore/Stripe/Firebase/Brevo service composition and singleton/factory service access.

### `/infrastructure`
The "Limbs" of the application.
- **`firebase/`**: Firebase initialization and server-side admin bridge.
- **`repositories/`**: Concrete Firestore implementations of Domain contracts.
- **`services/`**: Adapters for Stripe, Auth, and external gateways.
- **`server/`**: Next.js server-side helpers (Session, Guards, API response).

### `/app`
The "Nervous System" (Next.js App Router).
- **`api/`**: Protected and public API endpoints.
- **Top-level route folders**: Customer-facing pages and layouts.
- **`admin/`**: Merchant-facing management dashboard.

### `/ui`
The "Skin" of the application.
- **`components/`**: Reusable React components (Atomic Design).
- **`layouts/`**: Shared page structures (Navbar, Sidebar).
- **`hooks/`**: Custom React hooks for services and state.
- **`apiClientServices.ts`**: The browser-side API facade.

### `/utils`
The "Plumbing".
- Stateless helper functions (Formatters, Constants, Validators).
