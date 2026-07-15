# Security

Security model for MeowAcc — open-source self-hosted ecommerce on Firebase + Stripe.

Root policy file: [SECURITY.md](../SECURITY.md) (summary + links).

---

## Architecture principles

| Principle | Implementation |
| --- | --- |
| **Server-side commerce** | Money and stock mutations only in API routes → Core protocols |
| **No client Firestore writes** | Security rules block direct commerce mutation from browsers |
| **Signed sessions** | HTTP-only cookies; `SESSION_SECRET` HMAC |
| **CSRF mitigation** | `assertTrustedMutationOrigin` on mutating routes |
| **Least privilege admin** | Role + elevation for refunds and destructive ops |
| **Idempotent mutations** | Safe retries without double charge/refund/stock |

---

## Secrets management

### Required secrets (server-only)

| Secret | Purpose |
| --- | --- |
| `SESSION_SECRET` | Session cookie signing |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firestore Admin SDK |
| `STRIPE_SECRET_KEY` | Payment API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `SYSTEM_JOB_TOKEN` | Cleanup cron bearer auth |

### Public by design (client bundle)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client SDK — expected public |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js — expected public |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL |

### Optional

| Secret | Purpose |
| --- | --- |
| `BREVO_API_KEY` | Email |
| `GEMINI_API_KEY` / `HERMES_*` | Concierge |

### Storage

| Environment | Where |
| --- | --- |
| Local dev | `.env` (gitignored if contains secrets — use `.env.example` as template only) |
| Production | Firebase/hosting secret manager or CI secrets — never in repo |

**Never commit:** live API keys, service account JSON, webhook secrets, production `SESSION_SECRET`.

---

## Authentication

| Surface | Mechanism |
| --- | --- |
| Customer | Firebase Auth → signed session cookie |
| Admin | Same session + `users.role === 'admin'` |
| Elevated ops | Step-up / elevation flag on admin session |
| System jobs | Bearer `SYSTEM_JOB_TOKEN` |
| Stripe webhooks | Stripe signature header |

Guards: `src/infrastructure/server/apiGuards.ts`

| Function | Use |
| --- | --- |
| `requireSessionUser` | Authenticated customer |
| `requireAdminSession` | Admin routes |
| `requireStepUpAdminSession` | High-risk admin |
| `requireConfiguredBearerToken` | System cleanup routes |

---

## Authorization layers

```text
Request
  → session valid?
  → admin role? (if /api/admin/*)
  → elevated? (if refund / sensitive)
  → same-origin? (if mutation)
  → rate limit ok?
  → protocol delegate (business authorization inside AdminFlowService)
```

Concierge destructive tools add `validateToolCall` + session policy + amount caps.

---

## Commerce security

| Risk | Mitigation |
| --- | --- |
| Double charge | Stripe idempotency + webhook event dedup |
| Double refund | `refund_execution_claims` + `processedRefundKeys` |
| Double stock move | Ledger idempotency markers |
| Route bypassing protocols | Verification ladder seal tests in CI |
| Admin refund abuse | Elevation + reason + operator event log |
| Concierge over-refund | `MAX_CONCIERGE_REFUND_CENTS` + auth required |

Frozen boundary: [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)

---

## Firestore security rules

Rules must enforce:

- Customers read own orders/cart
- No client writes to orders, ledger, protocol claim collections
- Admin operations go through Admin SDK on server

Expected behavior tested in `src/tests/firestore-security.test.ts` — deploy rules that pass these tests.

---

## Transport

| Requirement | Notes |
| --- | --- |
| HTTPS in production | Required for secure cookies |
| HTTP-only cookies | Session theft mitigation |
| Same-origin mutations | CSRF |

Firebase Hosting provides HTTPS by default.

---

## Rate limiting

Applied on sensitive routes (auth, checkout, concierge) via `assertRateLimit` — backed by Firestore `rate_limits` collection.

---

## Audit and forensics

| Log | Contents |
| --- | --- |
| `AuditService` | Operator/customer actions |
| `admin_operator_events` | Admin protocol mutations |
| `refund_execution_events` | Refund audit with source |
| Structured logger | `orderId`, `caseId`, `stripeEventId` |

Admin UI: `/admin/audit`

---

## Incident response

If secrets exposed:

1. **Rotate immediately** — Stripe keys, webhook secret, `SESSION_SECRET`, Firebase service account
2. Invalidate active sessions (session secret rotation forces re-login)
3. Review Stripe Dashboard for unauthorized charges/refunds
4. Scan git history for committed secrets
5. Update hosting env vars before redeploy

---

## Security checklist (production)

- [ ] Unique production `SESSION_SECRET`
- [ ] Firebase service account scoped minimally
- [ ] Firestore rules deployed and tested
- [ ] Stripe webhook secret matches live endpoint only
- [ ] `SYSTEM_JOB_TOKEN` strong random; not in client
- [ ] Default dev admin password removed
- [ ] `ALLOW_PRODUCTION_SEEDING=false`
- [ ] No secrets in logs or error responses
- [ ] HTTPS only
- [ ] Dependency audit (`npm audit`) in CI

---

## Related

- [deployment.md](./deployment.md)
- [runbook.md](./runbook.md)
- [contributing-commerce.md](./contributing-commerce.md)
- [troubleshooting.md](./troubleshooting.md)
