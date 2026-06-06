'use client';

/**
 * [LAYER: UI]
 * Shared search & social preview — Google, Facebook, and X patterns
 * powered by the centralized SEO preview service.
 */
import React from 'react';
import Image from 'next/image';
import { Globe } from 'lucide-react';
import { getAppSeoEngine } from '@infrastructure/seo';
import type { SeoPreviewChannel } from '@domain/seo/preview';
import type { SeoPreviewInput } from '@domain/seo/preview';

interface SeoListingPreviewProps {
  input: Omit<SeoPreviewInput, 'siteName' | 'siteHost'>;
  activeChannel?: SeoPreviewChannel;
  onChannelChange?: (channel: SeoPreviewChannel) => void;
  showTabs?: boolean;
}

export function SeoListingPreview({
  input,
  activeChannel = 'google',
  onChannelChange,
  showTabs = true,
}: SeoListingPreviewProps) {
  const seo = getAppSeoEngine();
  const preview = seo.preview.listingPreview({
    ...input,
    siteName: seo.config.siteName,
    siteHost: seo.preview.siteHostLabel(),
  });

  const tabs: Array<{ id: SeoPreviewChannel; label: string }> = [
    { id: 'google', label: 'Google Search' },
    { id: 'social', label: 'Facebook & Instagram' },
    { id: 'twitter', label: 'X (Twitter)' },
  ];

  return (
    <div className="rounded-xl border bg-white p-6 shadow-xs ring-1 ring-black/5">
      {showTabs && (
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div className="flex flex-wrap gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChannelChange?.(tab.id)}
                className={`text-[10px] font-bold uppercase tracking-widest transition ${
                  activeChannel === tab.id ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
            <Globe className="h-3 w-3" />
            Live preview
          </div>
        </div>
      )}

      {activeChannel === 'google' && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[13px] text-[#202124]">
            <span className="font-medium text-gray-600">{preview.google.siteLabel}</span>
            <span className="text-gray-400">› {preview.google.breadcrumb}</span>
          </p>
          <h3 className="cursor-pointer text-xl font-medium leading-tight text-[#1a0dab] hover:underline">
            {preview.google.title}
          </h3>
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-[#4d5156]">
            {preview.google.description}
          </p>
        </div>
      )}

      {activeChannel === 'social' && (
        <div className="max-w-md overflow-hidden rounded-xl border bg-gray-50 shadow-sm">
          <div className="relative flex aspect-video items-center justify-center bg-gray-200 text-gray-400">
            {preview.social.imageUrl ? (
              <Image
                src={preview.social.imageUrl}
                alt=""
                fill
                sizes="400px"
                className="object-cover"
              />
            ) : (
              <Globe className="h-8 w-8" />
            )}
          </div>
          <div className="bg-white p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {preview.social.siteLabel}
            </p>
            <h3 className="mb-1 line-clamp-2 text-sm font-bold text-gray-900">{preview.social.title}</h3>
            <p className="line-clamp-2 text-xs text-gray-500">{preview.social.description}</p>
          </div>
        </div>
      )}

      {activeChannel === 'twitter' && (
        <div className="max-w-md overflow-hidden rounded-xl border bg-white p-4 shadow-sm">
          {preview.twitter.imageUrl && preview.twitter.card === 'summary_large_image' ? (
            <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-gray-100">
              <Image src={preview.twitter.imageUrl} alt="" fill sizes="400px" className="object-cover" />
            </div>
          ) : null}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {preview.twitter.siteLabel}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{preview.twitter.title}</h3>
          <p className="mt-1 line-clamp-3 text-xs text-gray-500">{preview.twitter.description}</p>
        </div>
      )}
    </div>
  );
}
