# Customization Guide

How to rebrand and extend MeowAcc without breaking commerce protocols. Shopify uses themes and apps; this platform uses **source-level customization** on a fork or private branch.

**Rule:** Customize UI, branding, and read paths freely. **Do not** bypass checkout, inventory, refund, or admin protocols for mutations.

---

## Customization layers

```text
┌─────────────────────────────────────────┐
│  BRANDING (safe)                         │  SEO, logos, copy, colors
├─────────────────────────────────────────┤
│  STOREFRONT UI (safe)                    │  React pages, components, layouts
├─────────────────────────────────────────┤
│  ADMIN UI (safe)                         │  Admin pages, navigation labels
├─────────────────────────────────────────┤
│  READ APIS / QUERIES (usually safe)      │  New GET endpoints, dashboards
├─────────────────────────────────────────┤
│  COMMERCE PROTOCOLS (frozen)             │  checkout · inventory · refunds · admin
└─────────────────────────────────────────┘
```

Extend mutations only through [contributing-commerce.md](./contributing-commerce.md).

---

## Rebrand your store

### 1. Admin settings (no code)

| Area | Path |
| --- | --- |
| Store name, contact | `/admin/settings` |
| SEO previews | `/admin/seo` |
| Navigation menu | `/admin/navigation` |
| Shipping / policies | Settings sections |

### 2. Environment (local SEO schema)

Update in `.env`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BUSINESS_*` fields

Reference: [environment-variables.md](./environment-variables.md)

### 3. Code-level brand constants

| File | Purpose |
| --- | --- |
| `src/domain/seo/brand.ts` | Site name, tagline, social handles, default descriptions |
| `public/images/` | Logos, OG images, favicons |
| `src/ui/components/Logo.tsx` | Wordmark component |
| `src/ui/layouts/Footer.tsx` | Footer copy |

WoodBine strings in the repo are **demo skin** — replace systematically:

```bash
# Discover remaining demo references (review before bulk replace)
rg "WoodBine" src/ public/ --glob '!*.test.*'
```

## Storefront visual customization

| What | Where |
| --- | --- |
| Home page sections | `src/ui/pages/home/` |
| Product card | `src/ui/pages/product-detail/`, listing components |
| Cart & checkout UI | `src/ui/cart/`, `src/ui/checkout/`, `src/app/checkout/` |
| Global layout | `src/ui/layouts/` (header, footer) |
| Tailwind theme | `tailwind` config / CSS variables in project styles |
| Collection pages | `src/app/collections/` + UI components |

No Liquid — React + Tailwind throughout.

**Keep:** API calls via `src/ui/apiClientServices.ts` — do not add Firestore client writes for commerce.

Guide: [storefront.md](./storefront.md)

---

## Admin customization

| What | Where |
| --- | --- |
| Navigation labels | `src/ui/navigation/adminNavigation.ts` |
| Dashboard widgets | `src/ui/pages/admin/` dashboard components |
| Setup guide copy | Admin setup guide API + UI |
| Command palette | `SearchCommandPalette` indexes `ADMIN_NAV_GROUPS` |

Keyboard shortcuts (e.g. `G H` → Home) defined on nav items in `adminNavigation.ts`.

---

## Catalog & vertical fit

| Need | Approach |
| --- | --- |
| Custom product fields | Metafields on product model + admin forms |
| Categories / types | `/admin/taxonomy` |
| Collections | `/admin/collections` |
| Digital vs physical | Product type drives checkout + vault |
| Multi-location stock | Locations + PO receive — [inventory.md](./inventory.md) |

TCG, apparel, food, digital goods all use the same engine with different catalog data and copy.

---

## Shopify merchant migration (conceptual)

| Shopify | MeowAcc |
| --- | --- |
| Theme | Fork + edit `src/ui/` |
| Products CSV | Build import script → admin API or seed |
| Customers | Firebase Auth + import users collection |
| Orders | Historical import optional — greenfield common |
| Apps | Source patches or future webhooks |
| Checkout | Built-in protocol — not replacable without fork |
| Inventory | Protocol + ledger — not Shopify's simple count |

You own migration scripts — no official Shopify importer ships with the repo.

---

## Safe extension patterns

| Want to add… | Pattern |
| --- | --- |
| New storefront section | Page + read API if needed |
| New admin report | Read-only route + query service |
| New discount rule | Extend domain validation + cart/checkout integration |
| New payment method | **Hard** — extend checkout stack internally, not new route Stripe calls |
| Webhook to external ERP | After protocol success — event emitter (roadmap: webhook hooks) |

---

## What not to customize (without protocol work)

| Avoid | Why |
| --- | --- |
| Direct Firestore stock writes | Breaks ledger reconciliation |
| Stripe calls in routes | Breaks idempotency and seals |
| Skip webhook handling | Orders stay pending |
| Remove verification ladder or storefront-release tests | Architecture enforcement lost |
| Client-side refund logic | Security + double-refund risk |

---

## Deployment of custom fork

1. Maintain private branch or fork on GitHub
2. Merge upstream protocol fixes regularly
3. Deploy with [deployment.md](./deployment.md)
4. Run [release-checklist.md](./release-checklist.md) before prod pushes

---

## Related

- [platform-overview.md](./platform-overview.md)
- [day-2.md § Rebrand](./day-2.md)
- [contributing-commerce.md](./contributing-commerce.md)
- [storefront.md](./storefront.md) · [admin.md](./admin.md)
