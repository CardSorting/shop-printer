'use client';

import { Search } from 'lucide-react';

export interface FormSectionLink {
  id: string;
  label: string;
  done?: boolean;
}

interface SeoFormSectionNavProps {
  sections: FormSectionLink[];
  activeId?: string;
}

/** Shopify-style “Jump to” section nav on long edit forms */
export function SeoFormSectionNav({ sections, activeId }: SeoFormSectionNavProps) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="rounded-xl border bg-white p-4 shadow-sm" aria-label="Jump to section">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">On this page</p>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => scrollTo(section.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition ${
                activeId === section.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{section.label}</span>
              {section.id === 'section-search-listing' && (
                <Search className="h-3 w-3 opacity-50" />
              )}
              {section.done !== undefined && (
                <span className={`text-[9px] uppercase tracking-widest ${section.done ? 'text-green-600' : 'text-amber-600'}`}>
                  {section.done ? 'Done' : 'Fix'}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
