# Architecture Decision Records (ADR)

This document tracks the critical architectural decisions that define the DreamBeesArt engine.

## ADR 1: Firestore as the Current Persistence Substrate
- **Decision**: Use Firestore repositories as the current production persistence adapter.
- **Rationale**: The repository now composes Core services with Firestore-backed product, cart, order, discount, inventory, support, marketing, wishlist, and settings repositories through `src/core/container.ts`.
- **Constraint**: Business code must depend on Domain repository contracts, not Firestore SDK details.

## ADR 2: Layered Joy-Zoning
- **Decision**: Enforce a 4-layer architecture (Domain, Core, Infrastructure, UI).
- **Rationale**: Prevents framework lock-in and ensures business rules (Domain) can be tested in isolation.
- **Constraint**: Domain stays pure. Core orchestrates. Infrastructure adapts Firestore/Auth/Stripe/server behavior. UI uses APIs and Domain-shaped data.

## ADR 3: Handle-Based Routing (SEO)
- **Decision**: Retire ID-based URLs in favor of canonical handles.
- **Rationale**: Industry-standard SEO practice. Improves search engine indexing and user-readable sharing.
- **Implementation**: The `TaxonomyService` manages handle generation and collision detection.

## ADR 4: Atomic Fulfillment State Machine
- **Decision**: Order status transitions must follow a validated state machine.
- **Rationale**: Prevents impossible states (e.g., `Delivered` → `Confirmed`).
- **Implementation**: Enforced in `src/domain/rules.ts` and `src/core/OrderService.ts`.

## ADR 5: Firestore-Backed Mutual Exclusion
- **Decision**: Use explicit lock providers for high-risk workflows such as checkout and collaborative support work.
- **Rationale**: Prevents duplicate in-flight checkout work and reduces multi-agent collision on customer operations.
- **Implementation**: `FirestoreLocker` implements the Domain `ILockProvider` contract and is injected into composed order services.

## ADR 6: Explicit Checkout Reconciliation
- **Decision**: Unsafe payment/order states become reconciliation cases instead of being hidden behind generic retries.
- **Rationale**: Financial correctness requires operator-visible evidence when Stripe and local state disagree.
- **Implementation**: `OrderCheckoutService`, `FirestoreOrderRepository`, and checkout forensic timeline helpers.
