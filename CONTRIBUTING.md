# Contributing to DreamBees Art

Thank you for helping build sovereign, inspectable commerce software. DreamBees Art is created and maintained by **William Cruz** and released under the [MIT License](LICENSE). Contributions that merge into this repository are licensed under the same terms.

---

## Before you start

1. Read [docs/brief.md](docs/brief.md) for a two-minute project overview.
2. Complete local setup via [docs/onboarding.md](docs/onboarding.md).
3. Skim [docs/philosophy.md](docs/philosophy.md) — protocol cages and proof gates are intentional, not bureaucracy.

**Prerequisites:** Node.js 22, Firebase (Auth + Firestore), Stripe test keys, `.env` from `.env.example`.

```bash
npm install
npm run setup
npm run dev
```

Daily workflow: [docs/local-development.md](docs/local-development.md)

---

## Ways to contribute

| Contribution | Good fit when… |
| --- | --- |
| **Bug fix** | You can reproduce the issue and add or update a test that would have caught it |
| **Feature** | The change fits existing architecture layers and does not bypass protocol cages |
| **Documentation** | You clarify setup, operations, or architecture for the next contributor |
| **Tests / proofs** | You strengthen storefront release gates or verification ladders |
| **Issue report** | You include repro steps, expected vs actual behavior, and environment details |

Open a pull request for code and doc changes. For security vulnerabilities, follow [SECURITY.md](SECURITY.md) — do not file public issues with exploit details.

---

## Development workflow

### 1. Branch from `main`

```bash
git checkout main
git pull
git checkout -b your-name/short-description
```

Use focused branches — one logical change per PR when possible.

### 2. Make the smallest correct change

| Layer | Path | Rule |
| --- | --- | --- |
| Domain | `src/domain/` | Pure rules — no I/O |
| Core | `src/core/` | Checkout, refunds, inventory, admin orchestration |
| Infrastructure | `src/infrastructure/` | Adapters, guards, Firestore, Stripe |
| App Router | `src/app/` | Thin HTTP boundaries |
| UI | `src/ui/` | APIs only — no direct Firestore or Stripe |

Architecture reference: [docs/architecture.md](docs/architecture.md)

### 3. Run verification before opening a PR

**Always:**

```bash
npm run typecheck
npm run lint
npm test -- --run
```

**If you touched storefront, cart, checkout, or catalog:**

```bash
npm run test:storefront-release
```

**If you touched checkout UI or payment flows:**

```bash
npm run test:e2e:cart-smoke       # cart/storage/merge/handoff changes
npm run test:e2e:checkout-smoke   # checkout UI changes
```

**If you changed commerce protocols** (`src/core/order/`, `src/core/inventory/`, `src/core/refund/`, `src/core/admin/`):

```bash
npm test -- --run src/tests/*-verification-ladder.test.ts
```

Full testing guide: [docs/testing.md](docs/testing.md)

---

## Commerce and money paths

Any change that moves money, stock, or operator authority must follow frozen protocol rules. **Read this before touching commerce code:**

- [docs/contributing-commerce.md](docs/contributing-commerce.md) — practical checklist
- [docs/commerce-protocol-frozen.md](docs/commerce-protocol-frozen.md) — architecture policy

**Golden rules (summary):**

1. Routes are thin — parse, guard, delegate, adapt.
2. Money and stock mutations go through `services.checkout`, `services.refunds`, `services.inventory`, or `services.admin` — never raw repositories or Stripe in routes.
3. Protocol methods return `*Result<T>` for expected failures.
4. Retryable mutations need idempotency keys.
5. Update verification ladder tests when protocol behavior changes.

---

## Pull request checklist

Before requesting review, confirm:

- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] Relevant tests pass (see verification section above)
- [ ] No secrets, `.env` values, or service account JSON in the diff
- [ ] Commerce changes follow [contributing-commerce.md](docs/contributing-commerce.md)
- [ ] User-visible behavior changes are reflected in docs (see below)
- [ ] PR description explains **why** the change is needed and how you verified it

### PR description template

```markdown
## Summary
What problem does this solve?

## Changes
- Bullet list of meaningful changes

## Verification
Commands run and results (e.g. test:storefront-release, e2e smoke)

## Docs
Which docs were updated, if any
```

---

## Documentation expectations

| Change type | Update |
| --- | --- |
| New public protocol method | `docs/checkout.md`, `docs/inventory.md`, or `docs/refunds.md` + [api-overview.md](docs/api-overview.md) |
| New operator workflow | [flows.md](docs/flows.md) + [admin.md](docs/admin.md) |
| New env var | [environment-variables.md](docs/environment-variables.md) + `.env.example` |
| Setup or dev workflow change | [onboarding.md](docs/onboarding.md) or [local-development.md](docs/local-development.md) |
| New term | [glossary.md](docs/glossary.md) |

---

## Code review standards

Reviewers (and contributors self-checking) ask:

1. Can this mutation be retried safely without double effect?
2. Does every failure path return a typed result at the protocol boundary?
3. Is there a test that would fail if someone bypassed the protocol cage?
4. Is this the smallest change that solves the use case?
5. Would an operator understand what happened from logs or audit trails?

---

## Style and conventions

- **TypeScript** throughout — match surrounding naming, imports, and error handling.
- **Comments** only for non-obvious business logic; prefer clear code and tests.
- **UI** calls go through `src/ui/apiClientServices.ts` — not the Firestore SDK.
- **Admin batch mutations** follow existing idempotency-key patterns.

---

## License and attribution

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE) and may be distributed with attribution to **William Cruz** as the project creator.

Copyright (c) 2026 William Cruz. See [LICENSE](LICENSE) for full terms.

---

## Related docs

| Doc | When |
| --- | --- |
| [docs/contributing-commerce.md](docs/contributing-commerce.md) | Commerce protocol changes |
| [docs/testing.md](docs/testing.md) | Test suites and proof gates |
| [docs/release-checklist.md](docs/release-checklist.md) | Pre-release verification |
| [docs/customization.md](docs/customization.md) | Forking and rebranding |
| [docs/index.md](docs/index.md) | Full documentation hub |
