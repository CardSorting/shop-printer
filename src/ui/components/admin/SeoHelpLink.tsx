'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { seoHubTabHref } from '@domain/seo/onboarding';

interface SeoHelpLinkProps {
  topic?: 'listing' | 'local' | 'general';
  guideId?: string;
  className?: string;
}

const TOPIC_GUIDE: Record<NonNullable<SeoHelpLinkProps['topic']>, string | undefined> = {
  listing: 'search-listing',
  local: 'local-maps',
  general: 'what-is-seo',
};

/** Inline help link — points merchants to the Learn tab (optional guide anchor) */
export function SeoHelpLink({ topic = 'general', guideId, className = '' }: SeoHelpLinkProps) {
  const guide = guideId ?? TOPIC_GUIDE[topic];
  const href = topic === 'local' ? seoHubTabHref('local') : seoHubTabHref('learn', guide);

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-700 ${className}`}
    >
      <HelpCircle className="h-3 w-3" />
      What is this?
    </Link>
  );
}
