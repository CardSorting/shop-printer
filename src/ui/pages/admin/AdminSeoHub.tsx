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
  LifeBuoy,
  LayoutGrid,
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
import { SEO_GLOSSARY } from '@domain/seo/glossary';
import { SeoFaqAccordion } from '@ui/components/admin/SeoFaqAccordion';
import { SeoWelcomeBanner } from '@ui/components/admin/SeoWelcomeBanner';
import { SeoTrafficLight } from '@ui/components/admin/SeoTrafficLight';
import { SeoScoreBreakdownPanel } from '@ui/components/admin/SeoScoreBreakdownPanel';
import { SeoSetupProgressPanel } from '@ui/components/admin/SeoSetupProgressPanel';
import { SeoHubNextStepBar } from '@ui/components/admin/SeoHubNextStepBar';
import { SeoGuideGrid } from '@ui/components/admin/SeoGuideGrid';
import { SeoLocalConfigPanel, SeoLocalEnvHint } from '@ui/components/admin/SeoLocalConfigPanel';
import { combinedNeedsWorkSummary } from '@domain/seo/merchant-ui';
import { adminListSeoFilterHref, adminHelpSeoFilterHref } from '@domain/seo/admin-routes';
import type { SeoAdminReport } from '@core/seo/SeoAdminReportService';
import type { CatalogListingAuditItem } from '@domain/seo/catalog';

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
  report: SeoAdminReport;
  siteHost: string;
  homepagePreview: SeoGooglePreview;
}

export function AdminSeoHub({ audit, snapshot, report, siteHost, homepagePreview }: AdminSeoHubProps) {
  const tab = useSeoHubTab();
  const publicPages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'public');
  const privatePages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'private');

  const scoreColor =
    audit.grade === 'excellent' ? 'text-green-600' : audit.grade === 'good' ? 'text-amber-600' : 'text-red-600';
  const barColor =
    audit.grade === 'excellent' ? 'bg-green-500' : audit.grade === 'good' ? 'bg-amber-500' : 'bg-red-500';

  const listingItems = [
    ...snapshot.products.items,
    ...snapshot.blogPosts.items,
    ...snapshot.collections.items,
    ...snapshot.helpArticles.items,
  ];
  const productListingItems = snapshot.products.items;
  const blogListingItems = snapshot.blogPosts.items;
  const helpListingItems = snapshot.helpArticles.items;
  const categoryListingItems = snapshot.collections.items.filter((item) => item.kind === 'category');
  const merchCollectionItems = snapshot.collections.items.filter((item) => item.kind === 'collection');
  const collectionNeedsWorkTotal = snapshot.collections.needsWork;
  const localIncomplete = audit.items.filter((i) => !i.done).length;
  const quickWins = report.quickWins;
  const indexing = report.indexing;

  return (
    <div className="space-y-6 pb-16">
      <AdminPageHeader
        title="Search & Visibility"
        subtitle="Help people find WoodBine on Google, maps, and social — the same tools Shopify merchants use, without the jargon."
        category="Marketing"
      />

      <SeoHubTabs
        counts={{
          listings: snapshot.combinedNeedsWork,
          localIncomplete,
          setupPercent: report.setupProgress.percent,
        }}
      />

      <SeoHubNextStepBar progress={report.setupProgress} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <SeoWelcomeBanner />
          <SeoSetupProgressPanel progress={report.setupProgress} />
          <SeoScoreBreakdownPanel breakdown={report.scoreBreakdown} />
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-3">
              <div className="border-b p-8 lg:col-span-1 lg:border-b-0 lg:border-r">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Site health</p>
                <p className={`mt-2 text-5xl font-black ${scoreColor}`}>{audit.score}</p>
                <p className="mt-1 text-sm font-bold text-gray-600">{gradeLabel(audit.grade)}</p>
                <div className="mt-3">
                  <SeoTrafficLight state={report.siteTrafficLight} showMessage />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full transition-all ${barColor}`} style={{ width: `${audit.score}%` }} />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-gray-500">
                  {combinedNeedsWorkSummary(snapshot.combinedNeedsWork)}
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Menu listings</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.products.optimized}/{snapshot.products.total}</p>
                    <p className="text-xs text-gray-500">{catalogGradeLabel(snapshot.products)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Collections</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.collections.optimized}/{snapshot.collections.total}</p>
                    <p className="text-xs text-gray-500">{catalogGradeLabel(snapshot.collections)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Blog stories</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.blogPosts.optimized}/{snapshot.blogPosts.total}</p>
                    <p className="text-xs text-gray-500">{catalogGradeLabel(snapshot.blogPosts)}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Help articles</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.helpArticles.optimized}/{snapshot.helpArticles.total}</p>
                    <p className="text-xs text-gray-500">{catalogGradeLabel(snapshot.helpArticles)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {quickWins.length > 0 && (
            <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-black text-gray-900">Quick wins</h2>
                  <p className="mt-1 text-xs text-gray-600">Fix these first for the fastest impact on search clicks.</p>
                </div>
                <Link href={seoHubTabHref('listings')} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                  View all →
                </Link>
              </div>
              <ol className="space-y-2">
                {quickWins.map((win) => (
                  <li key={win.id}>
                    <Link
                      href={win.href}
                      className="flex items-center gap-3 rounded-xl border bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-800">
                        {win.priority}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">{win.title}</p>
                        <p className="text-[11px] text-gray-500">{win.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Indexing status</h2>
            <p className="mt-1 text-xs text-gray-500">{indexing.merchantExplanation}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50/50 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-bold text-gray-900">{indexing.indexedLabel}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-600">{indexing.hiddenLabel}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-gray-900">Where to edit</h2>
            <p className="mt-1 text-xs text-gray-500">Same places Shopify merchants go — no code required.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {report.editDestinations.map((dest) => (
                <Link
                  key={dest.id}
                  href={dest.href}
                  className="rounded-xl border p-4 transition hover:border-primary-200 hover:bg-primary-50/20"
                >
                  <p className="text-sm font-bold text-gray-900">{dest.label}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{dest.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-gray-900">Sitemap coverage</h2>
            <p className="mt-1 text-xs text-gray-500">
              ~{report.sitemap.totalEstimatedUrls} URLs in your sitemap — Google uses this to discover pages.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-2 pr-4">Page type</th>
                    <th className="py-2 pr-4">Priority</th>
                    <th className="py-2">Updates</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...report.sitemap.static, ...report.sitemap.dynamic].map((row) => (
                    <tr key={row.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-gray-900">{row.label}</p>
                        <p className="text-[10px] text-gray-500">{row.description}</p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-gray-600">{row.priority.toFixed(2)}</td>
                      <td className="py-3 capitalize text-gray-600">{row.changeFrequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/sitemap.xml" target="_blank" className="mt-4 inline-block text-xs font-bold text-primary-600 hover:text-primary-700">
              View sitemap.xml →
            </Link>
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
                  href={adminListSeoFilterHref('/admin/products')}
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  All products
                </Link>
                <Link
                  href={adminListSeoFilterHref('/admin/blog')}
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  All stories
                </Link>
                <Link
                  href={adminListSeoFilterHref('/admin/taxonomy')}
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  Categories
                </Link>
                <Link
                  href={adminListSeoFilterHref('/admin/collections')}
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  Merchandising
                </Link>
                <Link
                  href={adminHelpSeoFilterHref()}
                  className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50"
                >
                  Help articles
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
              <div className="space-y-8">
                {(snapshot.products.needsWork > 20 || snapshot.blogPosts.needsWork > 20 || collectionNeedsWorkTotal > 20 || snapshot.helpArticles.needsWork > 20) && (
                  <p className="text-[11px] text-amber-700">
                    Each section shows up to 20 lowest-scoring listings. Use the links above to see the full filtered list.
                  </p>
                )}
                {(productListingItems.length > 0 || snapshot.products.needsWork > productListingItems.length) && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                      <UtensilsCrossed className="h-3.5 w-3.5" /> Menu items
                      {snapshot.products.needsWork > 0 && (
                        <span className="text-amber-600">({snapshot.products.needsWork} need work)</span>
                      )}
                    </h3>
                    <ListingRows items={productListingItems} totalNeedsWork={snapshot.products.needsWork} />
                  </div>
                )}
                {(blogListingItems.length > 0 || snapshot.blogPosts.needsWork > blogListingItems.length) && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                      <Newspaper className="h-3.5 w-3.5" /> Stories
                      {snapshot.blogPosts.needsWork > 0 && (
                        <span className="text-amber-600">({snapshot.blogPosts.needsWork} need work)</span>
                      )}
                    </h3>
                    <ListingRows items={blogListingItems} totalNeedsWork={snapshot.blogPosts.needsWork} />
                  </div>
                )}
                {(helpListingItems.length > 0 || snapshot.helpArticles.needsWork > helpListingItems.length) && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                        <LifeBuoy className="h-3.5 w-3.5" /> Help articles
                        {snapshot.helpArticles.needsWork > 0 && (
                          <span className="text-amber-600">({snapshot.helpArticles.needsWork} need work)</span>
                        )}
                      </h3>
                      <Link
                        href={adminHelpSeoFilterHref()}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-700"
                      >
                        Edit in admin →
                      </Link>
                      <Link
                        href="/support"
                        target="_blank"
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
                      >
                        View public →
                      </Link>
                    </div>
                    <ListingRows items={helpListingItems} totalNeedsWork={snapshot.helpArticles.needsWork} />
                  </div>
                )}
                {(categoryListingItems.length > 0 || merchCollectionItems.length > 0) && (
                  <div className="space-y-6">
                    {categoryListingItems.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                          <LayoutGrid className="h-3.5 w-3.5" /> Categories ({categoryListingItems.length})
                        </h3>
                        <ListingRows items={categoryListingItems} />
                      </div>
                    )}
                    {merchCollectionItems.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                          <LayoutGrid className="h-3.5 w-3.5" /> Merchandising collections ({merchCollectionItems.length})
                        </h3>
                        <ListingRows items={merchCollectionItems} />
                      </div>
                    )}
                  </div>
                )}
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
                    {!item.done && <SeoLocalEnvHint auditId={item.id} />}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-gray-400">
              Site address, phone, and hours are configured via environment variables (see{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[9px]">NEXT_PUBLIC_BUSINESS_*</code>{' '}
              in deployment settings). Also claim your profile on Google Business — that is separate from this dashboard.
            </p>
            {report.siteRecommendations.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Recommended next steps</p>
                <ul className="mt-2 space-y-2">
                  {report.siteRecommendations.slice(0, 4).map((rec) => (
                    <li key={rec.id} className="text-xs text-amber-900">
                      <span className="font-bold">{rec.title}</span> — {rec.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <SeoLocalConfigPanel items={audit.items} />

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
        <div className="space-y-6">
          <SeoGuideGrid guides={SEO_GUIDES} icons={GUIDE_ICONS} />
          <div className="rounded-2xl border bg-gray-900 p-6 text-white">
            <BookOpen className="h-5 w-5 text-primary-300" />
            <p className="mt-3 text-sm font-bold">Where to edit listings</p>
            <p className="mt-2 text-xs text-gray-300">
              Open any product → scroll to <strong>Search engine listing</strong>. Stories use the SEO tab. Categories
              and collections use the same editor in Taxonomy and Collections.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/products" className="rounded-lg bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900">
                Menu items
              </Link>
              <Link href="/admin/blog" className="rounded-lg border border-white/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                Stories
              </Link>
              <Link href="/admin/support" className="rounded-lg border border-white/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                Help center
              </Link>
            </div>
          </div>
          <SeoFaqAccordion entries={SEO_GLOSSARY} />
        </div>
      )}
    </div>
  );
}

function ListingRows({ items, totalNeedsWork }: { items: CatalogListingAuditItem[]; totalNeedsWork?: number }) {
  const kindLabel = (kind: CatalogListingAuditItem['kind']) => {
    switch (kind) {
      case 'blog':
        return 'Story';
      case 'category':
        return 'Category';
      case 'help':
        return 'Help';
      case 'help-category':
        return 'Help topic';
      case 'collection':
        return 'Collection';
      default:
        return 'Menu item';
    }
  };

  if (items.length === 0 && totalNeedsWork && totalNeedsWork > 0) {
    return (
      <p className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 text-xs text-amber-900">
        {totalNeedsWork} listing{totalNeedsWork === 1 ? '' : 's'} need work — more than we show here. Open the admin list with the Needs SEO filter to see all.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-xl border">
      {items.map((item) => (
        <div key={`${item.kind}-${item.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                {kindLabel(item.kind)}
              </span>
              <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
            </div>
            <p className="text-[10px] text-gray-400">{item.path}</p>
            <SeoScoreBadge score={item.score} />
          </div>
          <div className="flex items-center gap-3">
            <SeoStatusBadge score={item.score} />
            {item.kind === 'help' && (
              <Link
                href={item.path}
                target="_blank"
                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700"
              >
                View
              </Link>
            )}
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
  );
}
