# Security

MeowAcc security practices for self-hosted ecommerce (Firebase + Stripe + signed sessions).

**Full guide:** [docs/security.md](docs/security.md)

---

## Quick rules

- **Never commit** live secrets (`.env` with real keys, service account JSON, webhook secrets)
- Use **`.env.example`** as template; keep production secrets in hosting secret manager
- **`SESSION_SECRET`** — 32+ random characters; unique per environment
- **`ALLOW_PRODUCTION_SEEDING=false`** in production
- Commerce mutations **only** through API protocols — not client Firestore writes
- Rotate credentials immediately if exposed

---

## Required production secrets

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Session cookie signing |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server Firestore access |
| `STRIPE_SECRET_KEY` | Payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `SYSTEM_JOB_TOKEN` | Scheduled cleanup jobs |

Public client vars (`NEXT_PUBLIC_*`) are expected in the browser bundle.

---

## If credentials are exposed

1. Rotate affected Stripe, Firebase, and session secrets
2. Update hosting environment variables
3. Redeploy
4. Review Stripe Dashboard for unauthorized activity
5. Force user re-login (session secret rotation)

---

## Related

- [docs/security.md](docs/security.md) — full security model
- [docs/deployment.md](docs/deployment.md) — production checklist
- [docs/runbook.md](docs/runbook.md) — incident procedures
