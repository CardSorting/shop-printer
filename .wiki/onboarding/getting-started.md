# Getting Started with DreamBeesArt

This guide provides the onboarding path for developers initializing the DreamBeesArt commerce workspace.

## 🛠 System Prerequisites

- **Node.js**: `22.x` expected by `package.json`.
- **Firebase project**: Firestore and Authentication enabled.
- **Stripe account**: Required for real checkout/payment flows.
- **Operating System**: macOS, Linux, or WSL2.

---

## 🚀 The One-Command Setup

The most efficient way to initialize your workspace is through the integrated setup utility:

```bash
npm run setup
```

This command orchestrates the following industrial operations:
1. **Environment Verification**: Confirms Node.js compatibility.
2. **Sovereign Environment**: Copies `.env.example` to `.env` and generates a high-entropy `SESSION_SECRET`.
3. **Dependency Saturation**: Executes `npm install` to populate the workspace.
4. **Seed Data**: Runs project setup and seed helpers for local development data when configured.

---

## 🛡 Security Guardrails

Before transitioning to a production environment, verify the following security parameters:

| Parameter | Constraint | Rationale |
| :--- | :--- | :--- |
| `SESSION_SECRET` | 32+ Characters | Prevents session hijacking and HMAC bypass. |
| `ALLOW_PRODUCTION_SEEDING` | `false` | Prevents accidental data wipes in live environments. |
| `HTTP-Only Cookies` | Enabled | Mitigates XSS-based session theft (enforced in `session.ts`). |
| `CSRF Protection` | Origin Matching | Enforced via `assertTrustedMutationOrigin` in `apiGuards.ts`. |

---

## 🧭 Navigating the Engine

Once initialized, inspect these core architectural entry points:

- **Domain Integrity**: `src/domain/models.ts` (Business logic contracts).
- **Service Orchestration**: `src/core/container.ts` (Dependency injection).
- **Infrastructure Adapters**: `src/infrastructure/repositories/firestore/`, `src/infrastructure/services/`, and `src/infrastructure/firebase/bridge.ts`.
- **Client Facade**: `src/ui/apiClientServices.ts` (Type-safe UI-to-API bridge).

---

## 🚨 Verification Commands

Use these commands to ensure your workspace is structurally sound:

```bash
# Verify type safety and code quality
npm run lint

# Execute a full production-grade build
npm run build

# Execute unit/integration tests
npm run test

# Reproduce the Core order-flow benchmark
npm run benchmark:order-flow
```

For common issues, refer to the [Troubleshooting Guide](./troubleshooting.md).
