# Risk Map & Operational Security

This document identifies high-risk surfaces and the mitigation strategies implemented in WoodBine.

## 1. High-Risk Surfaces

| Surface | Risk | Mitigation |
| :--- | :--- | :--- |
| **Payments** | Fraud, Double-charging | Idempotency keys, real-time Stripe verification, and atomic order creation. |
| **Auth** | Session hijacking | Signed, HTTP-only cookies with TTL and recursive expiry checks. |
| **Inventory** | Race conditions and overselling | Transactional Firestore reads/writes through repository methods and checkout stock reservation. |
| **File Uploads** | RCE, Memory exhaustion | Streaming-first ingestion, file type validation, and chunked processing. |

## 2. Operational Guards

- **Rate Limiting**: Enforced on high-risk routes (Sign-in, Checkout) via `assertRateLimit` in `apiGuards.ts`.
- **Production Guardrails**: `ALLOW_PRODUCTION_SEEDING=false` prevents accidental database resets.
- **Mutual Exclusion**: `FirestoreLocker` provides distributed locking for checkout and other high-risk workflows.

## 3. Deployment Safety Checklist

1. [ ] **Secret Management**: Ensure `SESSION_SECRET` is >= 32 characters and rotated periodically.
2. [ ] **CSP**: Verify Content Security Policy in `next.config.ts` allows Stripe and Google Fonts.
3. [ ] **Backup Strategy**: Firestore scheduled exports or managed backups are configured and restore-tested.
4. [ ] **Rate Limits**: Tune rate limit buckets based on expected traffic.
