# Concierge

MeowAcc **Concierge** is an AI-assisted customer support and lifecycle marketing layer — comparable to Shopify Sidekick plus support automation, but wired to this platform’s orders, tickets, inventory, and refund protocols.

Concierge is not a separate product. It is a privileged client of the same Core services merchants use in admin, with tool policies and spend limits on autonomous actions.

---

## Surfaces

| Surface | Path | Audience |
| --- | --- | --- |
| Storefront bubble | `src/ui/components/Concierge/ConciergeBubble.tsx` | Shoppers |
| Chat API | `POST /api/concierge/chat` | Session + tool execution |
| Admin workspace | `/admin/concierge`, `AdminConciergeInsights.tsx` | Support leads |
| Session APIs | `/api/concierge/sessions`, admin session actions | Operators |

---

## Architecture

```text
Customer message
  → Concierge LLM (Gemini / optional Hermes)
  → Structured tool tokens in response
  → route.ts token parser + validateToolCall()
  → Core services (orders, tickets, refunds, KB, …)
  → Session updates + audit trail
```

**Intelligence core:** `src/core/ConciergeService.ts` — analysis, memory injection, grounding.

**System prompt:** `src/domain/concierge/systemPrompt.ts` — tool grammar and policy.

---

## Tool capabilities

Concierge can invoke operational tools when policy allows (non-exhaustive):

| Tool | Effect | Protocol |
| --- | --- | --- |
| Fetch order | Read order context | Read services |
| Add order note | Note on order | Order service (authorized) |
| Cancel order | Cancel if not shipped | Order service |
| **Process refund** | Partial refund | **`services.refunds.createRefund`** |
| Open / close ticket | Support CRM | Ticket repository |
| KB search | Help articles | Knowledge base |
| Update shipping address | Address change | Order update (guarded) |
| Escalate to human | Handoff flag | Session state |
| Lifecycle marketing | Campaign playbooks | Marketing services |

Destructive tools (`processRefund`, `cancelOrder`, etc.) pass through `validateToolCall()` and session context checks.

---

## Refund boundary (sealed)

Concierge refunds **must** use the refund protocol:

```text
services.refunds.createRefund({
  orderId,
  amount,
  idempotencyKey: `concierge-refund-{sessionId}-{orderId}-{amount}`,
  reason: `Concierge autonomous refund for session …`,
  actor: { id: 'concierge', email: 'concierge@woodbine.com' },
  source: 'concierge',
})
```

Concierge does **not** import `refundService`. Duplicate keys do not double-refund. Event log records `source: 'concierge'`.

See [refunds.md](../refunds.md).

---

## Trust and grounding

| Principle | Implementation |
| --- | --- |
| Facts vs assumptions | Transcript grounding in analysis output |
| Evidence quotes | Suggestions cite customer messages |
| Uncertainty | Explicit confidence notes |
| Operator feedback | Helpful / not useful loops in admin |
| Audit | `auditService.record` on autonomous actions |

---

## Admin operator workspace

Operators use Concierge admin for:

- Session triage and assignment
- Outcome tracking (resolved, escalated, converted)
- Operational digests (“shipping anxiety trending…”)
- Marketing strategy analysis endpoints
- Repeat-issue detection

Data model (Firestore session documents): `status`, `customerOutcome`, `assignedOperator`, `events[]`, `operatorFeedback[]`, forensic context fields.

---

## Configuration

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Primary LLM |
| `HERMES_*` | Optional alternate agent endpoint |
| Concierge settings API | `/api/concierge/settings` |

Without AI keys, Concierge degrades gracefully; core commerce continues unaffected.

---

## Limits and safety

| Guard | Behavior |
| --- | --- |
| `MAX_CONCIERGE_REFUND_CENTS` | Autonomous refund cap; escalate above |
| Customer auth | Refunds require logged-in customer |
| Tool validation | Destructive tools need session approval state |
| Rate limits | Route guards on chat endpoint |

---

## Related docs

- [Onboarding](../onboarding.md) — first purchase walkthrough
- [Flows](../flows.md) — end-to-end commerce stories
- [Architecture](../architecture.md) — system context
- [Refunds](../refunds.md) — money reversal protocol
- [Admin](../admin.md) — operator console

Lifecycle marketing depth: [.wiki/architecture/lifecycle-marketing-concierge.md](../../.wiki/architecture/lifecycle-marketing-concierge.md)
