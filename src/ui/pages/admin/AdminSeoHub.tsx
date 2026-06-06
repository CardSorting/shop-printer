'use client';

import Link from 'next/link';
import {
  ExternalLink,
  Globe,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Sparkles,
  BookOpen,
  UtensilsCrossed,
  Newspaper,
} from 'lucide-react';
import { gradeLabel } from '@domain/seo/health';
import { catalogGradeLabel } from '@domain/seo/catalog';
import { SEO_ADMIN_RESOURCES, SEO_PAGE_CATALOG } from '@domain/seo/registry';
import { SEO_EXTERNAL_TOOLS, SEO_GUIDES } from '@domain/seo/guides';
import { seoHubTabHref } from '@domain/seo/onboarding';
import type { SiteSeoAudit } from '@domain/seo/health';
import type { SeoAdminSnapshot } from '@core/seo/CatalogAuditService';
import type { SeoGooglePreview } from '@domain/seo/preview';
import { AdminPageHeader } from '@ui/components/admin/AdminComponents';
import { SeoHubTabs, useSeoHubTab } from '@ui/components/admin/SeoHubTabs';
import { SeoScoreBadge, SeoStatusBadge } from '@ui/components/admin/SeoStatusBadge';
import { SeoWelcomeBanner } from '@ui/components/admin/SeoWelcomeBanner';

const GUIDE_ICONS = {
  search: Globe,
  map: MapPin,
  share: Sparkles,
  menu: UtensilsCrossed,
  shield: CheckCircle2,
} as const;

interface AdminSeoHubProps {
  audit: SiteSeoAudit;
  snapshot: SeoAdminSnapshot;
  siteHost: string;
  homepagePreview: SeoGooglePreview;
}

export function AdminSeoHub({ audit, snapshot, siteHost, homepagePreview }: AdminSeoHubProps) {
  const tab = useSeoHubTab();
  const publicPages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'public');
  const privatePages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'private');

  const scoreColor =
    audit.grade === 'excellent' ? 'text-green-600' : audit.grade === 'good' ? 'text-amber-600' : 'text-red-600';
  const barColor =
    audit.grade === 'excellent' ? 'bg-green-500' : audit.grade === 'good' ? 'bg-amber-500' : 'bg-red-500';

  const listingItems = [...snapshot.products.items, ...snapshot.blogPosts.items];

  return (
    <div className="space-y-6 pb-16">
      <AdminPageHeader
        title="Search & Visibility"
        subtitle="Help people find WoodBine on Google, maps, and social — the same tools Shopify merchants use, without the jargon."
        category="Marketing"
      />

      <SeoHubTabs />

      {tab === 'overview' && (
        <div className="space-y-6">
          <SeoWelcomeBanner />
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-3">
              <div className="border-b p-8 lg:col-span-1 lg:border-b-0 lg:border-r">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Site health</p>
                <p className={`mt-2 text-5xl font-black ${scoreColor}`}>{audit.score}</p>
                <p className="mt-1 text-sm font-bold text-gray-600">{gradeLabel(audit.grade)}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full transition-all ${barColor}`} style={{ width: `${audit.score}%` }} />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-gray-500">
                  {snapshot.combinedNeedsWork > 0
                    ? `${snapshot.combinedNeedsWork} menu item${snapshot.combinedNeedsWork === 1 ? '' : 's'} or stor${snapshot.combinedNeedsWork === 1 ? 'y' : 'ies'} could rank better with a quick listing edit.`
                    : 'Your public listings and site basics look solid. Keep hours and photos up to date.'}
                </p>
                {snapshot.combinedNeedsWork > 0 && (
                  <Link
                    href={seoHubTabHref('listings')}
                    className="mt-4 inline-block text-xs font-bold text-primary-600 hover:text-primary-700"
                  >
                    Review listings →
                  </Link>
                )}
              </div>

              <div className="space-y-4 p-8 lg:col-span-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  How your homepage looks on Google
                </h3>
                <div className="rounded-xl border bg-white p-5 ring-1 ring-black/5">
                  <p className="text-[13px] text-[#202124]">
                    <span className="font-medium text-gray-600">{homepagePreview.siteLabel}</span>
                    <span className="text-gray-400"> › {homepagePreview.breadcrumb}</span>
                  </p>
                  <p className="mt-1 text-lg font-medium text-[#1a0dab]">{homepagePreview.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{homepagePreview.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Menu listings</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.products.optimized}/{snapshot.products.total}</p>
                    <p className="text-xs text-gray-500">{catalogGradeLabel(snapshot.products)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Blog stories</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.blogPosts.optimized}/{snapshot.blogPosts.total}</p>
                    <p className="text-xs text-gray-500">{catalogGradeLabel(snapshot.blogPosts)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary-600" />
                <h2 className="text-sm font-black text-gray-900">Pages Google can find</h2>
              </div>
              <div className="space-y-2">
                {publicPages.map((page) => (
                  <Link
                    key={page.id}
                    href={page.path}
                    target="_blank"
                    className="group flex items-center justify-between rounded-xl border border-gray-100 p-4 transition hover:border-primary-200 hover:bg-primary-50/30"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-primary-700">{page.label}</p>
                      <p className="text-xs text-gray-500">{page.description}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-primary-500" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-600" />
                  <h2 className="text-sm font-black text-gray-900">Search engine files</h2>
                </div>
                <div className="space-y-2">
                  {SEO_ADMIN_RESOURCES.filter((r) => r.id !== 'storefront').map((resource) => (
                    <Link
                      key={resource.id}
                      href={resource.path}
                      target="_blank"
                      className="block rounded-xl border border-gray-100 p-4 transition hover:bg-gray-50"
                    >
                      <p className="text-sm font-bold text-gray-900">{resource.label}</p>
                      <p className="text-xs text-gray-500">{resource.description}</p>
                      <p className="mt-1 font-mono text-[10px] text-gray-400">
                        {siteHost}
                        {resource.path}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900">Listings that need attention</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Same checklist as the &quot;Search engine listing&quot; box on each product — fix these first for the
                  biggest impact.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/admin/products"
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  All products
                </Link>
                <Link
                  href="/admin/blog"
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  All stories
                </Link>
              </div>
            </div>

            {listingItems.length === 0 ? (
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                <p className="mt-3 text-sm font-bold text-gray-900">All listings look good</p>
                <p className="mt-1 text-xs text-gray-600">Every active menu item and published story passes the SEO checklist.</p>
              </div>
            ) : (
              <div className="divide-y rounded-xl border">
                {listingItems.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      {item.kind === 'product' ? (
                        <UtensilsCrossed className="mt-0.5 h-4 w-4 text-gray-400" />
                      ) : (
                        <Newspaper className="mt-0.5 h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.path}</p>
                        <SeoScoreBadge score={item.score} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <SeoStatusBadge score={item.score} />
                      <Link
                        href={item.editPath}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
                      >
                        Edit listing <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'local' && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-gray-900">Local presence checklist</h2>
            <p className="mt-1 text-xs text-gray-500">
              These details power map pins, &quot;near me&quot; searches, and structured data on your site.
            </p>
            <div className="mt-6 space-y-3">
              {audit.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    item.done ? 'border-green-100 bg-green-50/50' : 'border-amber-100 bg-amber-50/30'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                    <p className="mt-0.5 text-xs text-gray-600">{item.hint}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-gray-400">
              Site address, phone, and hours are configured in deployment settings. Also claim your profile on Google
              Business — that is separate from this dashboard.
            </p>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-gray-900">Free tools from Google & Bing</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SEO_EXTERNAL_TOOLS.map((tool) => (
                <a
                  key={tool.id}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between rounded-xl border p-4 transition hover:border-primary-200 hover:bg-primary-50/20"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">{tool.label}</p>
                    <p className="text-xs text-gray-500">{tool.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-300" />
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed bg-gray-50 p-6">
            <p className="text-sm font-bold text-gray-900">Hidden from Google (on purpose)</p>
            <ul className="mt-3 space-y-1">
              {privatePages.map((page) => (
                <li key={page.id} className="text-[11px] font-medium text-gray-600">
                  · {page.label} — {page.description}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'learn' && (
        <div className="grid gap-4 md:grid-cols-2">
          {SEO_GUIDES.map((guide) => {
            const Icon = GUIDE_ICONS[guide.icon];
            return (
              <article key={guide.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-black text-gray-900">{guide.title}</h2>
                </div>
                <p className="text-xs leading-relaxed text-gray-600">{guide.summary}</p>
                <ol className="mt-4 space-y-2">
                  {guide.steps.map((step, i) => (
                    <li key={step} className="flex gap-2 text-xs text-gray-700">
                      <span className="font-black text-primary-600">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
          <div className="rounded-2xl border bg-gray-900 p-6 text-white md:col-span-2">
            <BookOpen className="h-5 w-5 text-primary-300" />
            <p className="mt-3 text-sm font-bold">Where to edit listings</p>
            <p className="mt-2 text-xs text-gray-300">
              Open any product → scroll to <strong>Search engine listing</strong>. Blog posts use the same fields under
              SEO when editing a story.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/products" className="rounded-lg bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900">
                Menu items
              </Link>
              <Link href="/admin/blog" className="rounded-lg border border-white/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                Stories
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
