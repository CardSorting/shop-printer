/**
 * [LAYER: DOMAIN — SEO]
 * Pure SEO health scoring — Yoast / Shopify Search Listing parity.
 */

import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_GRADE_THRESHOLDS,
  SEO_HANDLE_MIN,
  SEO_TITLE_MAX,
  SEO_TITLE_MIN,
  type SeoGrade,
} from './constants';
import { cleanSeoText, clipSeoDescription, seoDescription } from './rules';
import type { SeoSiteConfig } from './types';

export interface SeoChecklistItem {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
}

export interface ListingSeoInput {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle?: string;
  imageUrl?: string;
}

export interface SeoHealthResult {
  score: number;
  grade: SeoGrade;
  checklist: SeoChecklistItem[];
  suggestions: string[];
}

export interface SiteSeoAuditItem {
  id: string;
  label: string;
  done: boolean;
  hint: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SiteSeoAudit {
  score: number;
  grade: SeoGrade;
  items: SiteSeoAuditItem[];
}

function gradeFromScore(score: number): SeoGrade {
  if (score >= SEO_GRADE_THRESHOLDS.excellent) return 'excellent';
  if (score >= SEO_GRADE_THRESHOLDS.good) return 'good';
  if (score >= SEO_GRADE_THRESHOLDS.needsWork) return 'needs-work';
  return 'poor';
}

function lengthStatus(length: number, min: number, max: number): 'short' | 'good' | 'long' | 'empty' {
  if (length === 0) return 'empty';
  if (length < min) return 'short';
  if (length > max) return 'long';
  return 'good';
}

export function auditListingSeo(input: ListingSeoInput): SeoHealthResult {
  const title = cleanSeoText(input.seoTitle) || cleanSeoText(input.name);
  const description =
    cleanSeoText(input.seoDescription) || cleanSeoText(input.description);
  const handle = cleanSeoText(input.handle);

  const titleStatus = lengthStatus(title.length, SEO_TITLE_MIN, SEO_TITLE_MAX);
  const descStatus = lengthStatus(description.length, SEO_DESCRIPTION_MIN, SEO_DESCRIPTION_MAX);

  const checklist: SeoChecklistItem[] = [
    {
      id: 'title-present',
      label: 'Page title is present',
      done: title.length > 0,
      hint: 'Use the product or page name as a starting point.',
    },
    {
      id: 'title-length',
      label: `Page title length (${SEO_TITLE_MIN}–${SEO_TITLE_MAX} characters)`,
      done: titleStatus === 'good',
      hint:
        titleStatus === 'short'
          ? 'Add a few more words so Google has enough context.'
          : titleStatus === 'long'
            ? 'Trim the title so it is not cut off in search results.'
            : undefined,
    },
    {
      id: 'description-present',
      label: 'Meta description is present',
      done: description.length > 0,
      hint: 'Write a short summary that invites people to click.',
    },
    {
      id: 'description-length',
      label: `Meta description length (${SEO_DESCRIPTION_MIN}–${SEO_DESCRIPTION_MAX} characters)`,
      done: descStatus === 'good',
      hint:
        descStatus === 'short'
          ? 'Aim for at least two full sentences about what makes this item special.'
          : descStatus === 'long'
            ? 'Shorten the description so the full message shows in search.'
            : undefined,
    },
    {
      id: 'handle',
      label: 'Clean URL handle',
      done: handle.length >= SEO_HANDLE_MIN && !/\s/.test(handle),
      hint: 'Use lowercase words separated by hyphens, like "cold-brew-latte".',
    },
    {
      id: 'image',
      label: 'Preview image available',
      done: Boolean(input.imageUrl),
      hint: 'Images improve clicks when this page is shared on social media.',
    },
  ];

  let score = 0;
  if (input.seoTitle) score += 25;
  else if (input.name) score += 12;
  if (input.seoDescription) score += 25;
  else if (input.description) score += 12;
  if (titleStatus === 'good') score += 20;
  else if (title.length > 0) score += 8;
  if (descStatus === 'good') score += 20;
  else if (description.length > 0) score += 8;
  if (checklist.find((c) => c.id === 'handle')?.done) score += 5;
  if (input.imageUrl) score += 5;

  const suggestions: string[] = [];
  if (!input.seoTitle && input.name) {
    suggestions.push('Add a custom page title focused on what customers search for.');
  }
  if (!input.seoDescription && input.description) {
    suggestions.push('Turn your product description into a tighter meta description.');
  }
  if (titleStatus === 'long') suggestions.push('Shorten the page title to stay under 60 characters.');
  if (descStatus === 'short') suggestions.push('Expand the meta description toward 120–160 characters.');
  if (!input.imageUrl) suggestions.push('Add a photo so social previews look professional.');

  return {
    score: Math.min(100, score),
    grade: gradeFromScore(Math.min(100, score)),
    checklist,
    suggestions,
  };
}

export function suggestListingSeo(input: ListingSeoInput, siteName: string): {
  seoTitle: string;
  seoDescription: string;
} {
  const rawTitle = cleanSeoText(input.seoTitle) || cleanSeoText(input.name);
  const seoTitle = clipSeoDescription(rawTitle, SEO_TITLE_MAX).replace(/\.\.\.$/, '');
  const baseDesc = input.seoDescription || input.description || input.name;
  const seoDescriptionText = seoDescription(
    baseDesc,
    `${input.name} at ${siteName} — Salt Lake City's neighborhood food hall.`,
    SEO_DESCRIPTION_MAX
  );
  return { seoTitle, seoDescription: seoDescriptionText };
}

export function auditSiteSeo(config: SeoSiteConfig): SiteSeoAudit {
  const items: SiteSeoAuditItem[] = [
    {
      id: 'site-url',
      label: 'Website address configured',
      done: config.siteUrl.startsWith('https://'),
      hint: 'Use HTTPS in production so browsers and Google trust your site.',
      priority: 'high',
    },
    {
      id: 'locality',
      label: 'City listed for local search',
      done: config.locality.length > 0,
      hint: 'Your city helps WoodBine appear in "food hall near me" searches.',
      priority: 'high',
    },
    {
      id: 'street',
      label: 'Street address on file',
      done: Boolean(config.street),
      hint: 'Add your address so Google Maps and local results can point people to the hall.',
      priority: 'high',
    },
    {
      id: 'geo',
      label: 'Map coordinates configured',
      done: config.geoLat !== undefined && config.geoLng !== undefined,
      hint: 'Latitude and longitude sharpen map pins and local pack placement.',
      priority: 'medium',
    },
    {
      id: 'phone',
      label: 'Phone number listed',
      done: Boolean(config.phone),
      hint: 'A public phone number builds trust in local business listings.',
      priority: 'medium',
    },
    {
      id: 'hours',
      label: 'Opening hours configured',
      done: Boolean(config.hoursOpens && config.hoursCloses),
      hint: 'Hours appear in Google and help first-timers know when to walk in.',
      priority: 'medium',
    },
    {
      id: 'social',
      label: 'Social profiles linked',
      done: config.socialProfiles.length >= 2,
      hint: 'Connected profiles reinforce brand identity in knowledge panels.',
      priority: 'low',
    },
    {
      id: 'og-image',
      label: 'Default share image set',
      done: Boolean(config.defaultOgImage),
      hint: 'This image shows when your homepage is shared on social media.',
      priority: 'medium',
    },
  ];

  const weights = { high: 20, medium: 10, low: 5 };
  const earned = items.reduce((sum, item) => {
    if (!item.done) return sum;
    return sum + weights[item.priority];
  }, 0);
  const possible = items.reduce((sum, item) => sum + weights[item.priority], 0);
  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  return { score, grade: gradeFromScore(score), items };
}

export function gradeLabel(grade: SeoGrade): string {
  switch (grade) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'needs-work':
      return 'Needs work';
    default:
      return 'Getting started';
  }
}
