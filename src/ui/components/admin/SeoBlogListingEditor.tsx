'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getAppSeoEngine } from '@infrastructure/seo';
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '@domain/seo/constants';
import { SeoTrafficLight } from '@ui/components/admin/SeoTrafficLight';
import { SeoChecklistPanel } from '@ui/components/admin/SeoChecklistPanel';
import { SeoListingPreview } from '@ui/components/admin/SeoListingPreview';
import { SeoHelpLink } from '@ui/components/admin/SeoHelpLink';
import { SeoLocalSignalsPanel } from '@ui/components/admin/SeoLocalSignalsPanel';
import { useSeoListingAudit } from '@ui/hooks/useSeoListingAudit';

interface SeoBlogListingEditorProps {
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  featuredImageUrl?: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
}

/** Centralized blog SEO tab — same engine as product Search engine listing */
export function SeoBlogListingEditor({
  title,
  excerpt,
  metaTitle,
  metaDescription,
  slug,
  featuredImageUrl,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: SeoBlogListingEditorProps) {
  const seo = getAppSeoEngine();

  const { health, trafficLight, recommendations } = useSeoListingAudit(
    {
      name: title,
      description: excerpt,
      seoTitle: metaTitle,
      seoDescription: metaDescription,
      handle: slug,
      imageUrl: featuredImageUrl,
    },
    'blog'
  );

  const titleLen = (metaTitle || title).length;
  const descLen = (metaDescription || excerpt).length;

  const suggest = () => {
    const suggested = seo.health.suggestListing({
      name: title,
      description: excerpt,
      seoTitle: metaTitle,
      seoDescription: metaDescription,
      handle: slug,
    });
    if (!metaTitle) onMetaTitleChange(suggested.seoTitle);
    if (!metaDescription) onMetaDescriptionChange(suggested.seoDescription);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-3">
        <SeoTrafficLight state={trafficLight} showMessage />
        <SeoHelpLink topic="listing" />
      </div>

      <SeoListingPreview
        input={{
          name: title,
          description: excerpt,
          seoTitle: metaTitle,
          seoDescription: metaDescription,
          handle: slug,
          pathPrefix: '/blog',
          imageUrl: featuredImageUrl,
        }}
      />

      {health.score < 85 && (
        <button
          type="button"
          onClick={suggest}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-100 bg-primary-50 py-3 text-[10px] font-black uppercase tracking-widest text-primary-700 hover:bg-primary-100"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Suggest improvements
        </button>
      )}

      <div className="space-y-6 pt-6 border-t border-gray-50">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Page title</label>
            <span className={`text-[10px] font-bold ${titleLen > SEO_TITLE_MAX ? 'text-red-600' : 'text-gray-400'}`}>
              {titleLen}/{SEO_TITLE_MAX}
            </span>
          </div>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder={title}
            className="w-full h-12 px-5 rounded-xl bg-gray-50 text-xs font-bold outline-none border border-transparent focus:border-primary-100"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meta description</label>
            <span className={`text-[10px] font-bold ${descLen > SEO_DESCRIPTION_MAX ? 'text-red-600' : 'text-gray-400'}`}>
              {descLen}/{SEO_DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            rows={3}
            placeholder={excerpt}
            className="w-full p-5 rounded-xl bg-gray-50 text-xs font-medium outline-none border border-transparent focus:border-primary-100 resize-none"
          />
        </div>
      </div>

      <SeoChecklistPanel checklist={health.checklist} recommendations={recommendations} />

      <SeoLocalSignalsPanel
        input={{
          name: title,
          description: excerpt,
          seoTitle: metaTitle,
          seoDescription: metaDescription,
          handle: slug,
          imageUrl: featuredImageUrl,
        }}
      />

      <Link href="/admin/seo?tab=learn&guide=search-listing" className="block text-center text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-700">
        Learn more in Search & Visibility →
      </Link>
    </div>
  );
}
