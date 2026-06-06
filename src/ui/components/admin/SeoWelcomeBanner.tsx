'use client';

import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SEO_DISMISS_WELCOME_KEY, SEO_GETTING_STARTED_STEPS, seoHubTabHref } from '@domain/seo/onboarding';

/** Dismissible welcome strip — Shopify “getting started” pattern */
export function SeoWelcomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(SEO_DISMISS_WELCOME_KEY) !== '1');
  }, []);

  if (!visible) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary-100 bg-linear-to-r from-primary-50/80 to-white p-6 shadow-sm">
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(SEO_DISMISS_WELCOME_KEY, '1');
          setVisible(false);
        }}
        className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary-100 p-2 text-primary-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-gray-900">Welcome to Search & Visibility</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-600">
            This is where you control how WoodBine appears on Google, maps, and social — no code required.
            Follow the three steps below or jump to any tab.
          </p>
        </div>
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {SEO_GETTING_STARTED_STEPS.map((item) => (
          <li key={item.step}>
            <Link
              href={seoHubTabHref(item.tab)}
              className="block h-full rounded-xl border bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">
                Step {item.step}
              </span>
              <p className="mt-1 text-sm font-bold text-gray-900">{item.title}</p>
              <p className="mt-1 text-[11px] text-gray-500">{item.body}</p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
