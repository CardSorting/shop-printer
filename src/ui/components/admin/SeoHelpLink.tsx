'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

interface SeoHelpLinkProps {
  topic?: 'listing' | 'local' | 'general';
  className?: string;
}

const TOPIC_HREF: Record<NonNullable<SeoHelpLinkProps['topic']>, string> = {
  listing: '/admin/seo?tab=learn',
  local: '/admin/seo?tab=local',
  general: '/admin/seo?tab=learn',
};

/** Inline help link — points merchants to the Learn tab */
export function SeoHelpLink({ topic = 'general', className = '' }: SeoHelpLinkProps) {
  return (
    <Link
      href={TOPIC_HREF[topic]}
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-700 ${className}`}
    >
      <HelpCircle className="h-3 w-3" />
      What is this?
    </Link>
  );
}
