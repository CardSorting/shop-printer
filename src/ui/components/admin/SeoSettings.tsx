'use client';

/**
 * [LAYER: UI]
 * Search engine listing editor — Shopify-style "Search engine listing preview"
 * for non-technical merchants. Powered by the centralized SEO engine.
 */
import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, AlertCircle, Info, Sparkles, Check } from 'lucide-react';
import { getAppSeoEngine } from '@infrastructure/seo';
import { gradeLabel } from '@domain/seo/health';
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '@domain/seo/constants';
import type { SeoPreviewChannel } from '@domain/seo/preview';
import { HelpTooltip } from './AdminComponents';
import { SeoListingPreview } from './SeoListingPreview';
import { SeoHelpLink } from './SeoHelpLink';
import { slugify } from '@utils/navigation';

interface SeoSettingsProps {
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  handle: string;
  onChange: (name: string, value: string) => void;
  pathPrefix?: string;
  imageUrl?: string;
  isEdit?: boolean;
  sectionId?: string;
}

export function SeoSettings({
  name,
  description,
  seoTitle,
  seoDescription,
  handle,
  onChange,
  pathPrefix = '/products',
  imageUrl,
  isEdit = false,
  sectionId = 'section-search-listing',
}: SeoSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<SeoPreviewChannel>('google');
  const seo = getAppSeoEngine();

  const displayHandle = handle || slugify(name || 'product-handle') || 'product-handle';

  const health = useMemo(
    () =>
      seo.health.auditListing({
        name,
        description,
        seoTitle,
        seoDescription,
        handle: displayHandle,
        imageUrl,
      }),
    [seo, name, description, seoTitle, seoDescription, displayHandle, imageUrl]
  );

  const titleLength = (seoTitle || name || '').length;
  const descLength = (seoDescription || description || '').length;

  const getLengthColor = (length: number, max: number) => {
    if (length === 0) return 'text-gray-400';
    if (length > max) return 'text-red-600 font-bold';
    if (length > max * 0.8) return 'text-amber-600 font-bold';
    return 'text-green-600 font-bold';
  };

  const handleGenerateSeo = () => {
    const suggested = seo.health.suggestListing({ name, description, seoTitle, seoDescription, handle });
    if (!seoTitle) onChange('seoTitle', suggested.seoTitle);
    if (!seoDescription) onChange('seoDescription', suggested.seoDescription);
  };

  const scoreColor =
    health.grade === 'excellent' ? 'bg-green-500' : health.grade === 'good' ? 'bg-amber-500' : 'bg-red-500';
  const healthBadge =
    health.grade === 'excellent'
      ? 'bg-green-100 text-green-700'
      : health.grade === 'good'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';

  return (
    <section id={sectionId} className="overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md scroll-mt-24">
      <div className="flex items-center justify-between border-b bg-gray-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-gray-400" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Search engine listing
              </h2>
              <HelpTooltip text="This is how your page appears on Google and when shared on social media. Clear titles and descriptions help more people find WoodBine." />
              <SeoHelpLink topic="listing" />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 w-24 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full transition-all duration-500 ${scoreColor}`}
                  style={{ width: `${health.score}%` }}
                />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">
                SEO score: {health.score}/100 · {gradeLabel(health.grade)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {health.score < 85 && (
            <button
              type="button"
              onClick={handleGenerateSeo}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-600 transition hover:text-primary-700"
            >
              <Sparkles className="h-3 w-3" />
              Suggest improvements
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-xs font-bold text-primary-600 transition hover:text-primary-700"
          >
            {isEditing ? (
              <>
                <ChevronUp className="h-3 w-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Edit listing
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-5">
        <SeoListingPreview
          input={{
            name,
            description,
            seoTitle,
            seoDescription,
            handle: displayHandle,
            pathPrefix,
            imageUrl,
          }}
          activeChannel={activeTab}
          onChannelChange={setActiveTab}
        />

        {isEditing ? (
          <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Page title
                    </label>
                    <span className={`text-[10px] ${getLengthColor(titleLength, SEO_TITLE_MAX)}`}>
                      {titleLength} / {SEO_TITLE_MAX}
                    </span>
                  </div>
                  <input
                    name="seoTitle"
                    value={seoTitle}
                    onChange={(e) => onChange('seoTitle', e.target.value)}
                    placeholder={name}
                    className="w-full rounded-lg border bg-gray-50 px-4 py-2.5 text-sm font-bold outline-none transition focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-[10px] text-gray-400">
                    Lead with what people search for — vendor name, dish, or neighborhood.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    URL handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 opacity-50">
                      {pathPrefix}/
                    </span>
                    <input
                      name="handle"
                      value={handle}
                      onChange={(e) => onChange('handle', e.target.value)}
                      placeholder={displayHandle}
                      className="w-full rounded-lg border bg-gray-50 py-2.5 pl-[88px] pr-4 text-sm font-bold outline-none transition focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  {isEdit && handle && handle !== displayHandle && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-[10px] font-bold text-red-700">
                      <AlertCircle className="h-3 w-3" />
                      Changing the URL may break existing links to this page.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Meta description
                    </label>
                    <span className={`text-[10px] ${getLengthColor(descLength, SEO_DESCRIPTION_MAX)}`}>
                      {descLength} / {SEO_DESCRIPTION_MAX}
                    </span>
                  </div>
                  <textarea
                    name="seoDescription"
                    value={seoDescription}
                    onChange={(e) => onChange('seoDescription', e.target.value)}
                    rows={4}
                    placeholder={description}
                    className="w-full rounded-lg border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-[10px] text-gray-400">
                    Write two sentences: what it is, and why someone at the hall would love it.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-5">
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  SEO checklist
                </h4>
                <div className="space-y-3">
                  {health.checklist.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          item.done
                            ? 'border-green-200 bg-green-100 text-green-600'
                            : 'border-gray-200 bg-white text-gray-300'
                        }`}
                      >
                        {item.done && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <div>
                        <span
                          className={`text-[11px] font-medium ${item.done ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                          {item.label}
                        </span>
                        {!item.done && item.hint && (
                          <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{item.hint}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {health.suggestions.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Suggestions
                    </p>
                    <ul className="space-y-2">
                      {health.suggestions.map((tip) => (
                        <li key={tip} className="text-[10px] leading-relaxed text-gray-600">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-gray-500">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              Tap &quot;Edit listing&quot; to customize how this page appears in search.
            </div>
            <div className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${healthBadge}`}>
              {gradeLabel(health.grade)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
