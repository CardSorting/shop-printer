/**
 * [LAYER: DOMAIN — SEO]
 * Yoast / Rank Math traffic-light semantics for merchant UX.
 */

import type { SeoGrade } from './constants';
import { SEO_GRADE_THRESHOLDS } from './constants';

export type SeoTrafficLight = 'green' | 'amber' | 'red';

export interface SeoTrafficLightState {
  light: SeoTrafficLight;
  grade: SeoGrade;
  label: string;
  merchantMessage: string;
}

export function trafficLightFromScore(score: number): SeoTrafficLightState {
  const grade: SeoGrade =
    score >= SEO_GRADE_THRESHOLDS.excellent
      ? 'excellent'
      : score >= SEO_GRADE_THRESHOLDS.good
        ? 'good'
        : score >= SEO_GRADE_THRESHOLDS.needsWork
          ? 'needs-work'
          : 'poor';

  return trafficLightFromGrade(grade, score);
}

export function trafficLightFromGrade(grade: SeoGrade, score?: number): SeoTrafficLightState {
  switch (grade) {
    case 'excellent':
      return {
        light: 'green',
        grade,
        label: 'Good',
        merchantMessage: score !== undefined ? `Search listing score ${score}/100 — looks great on Google.` : 'This listing is in great shape.',
      };
    case 'good':
      return {
        light: 'amber',
        grade,
        label: 'OK',
        merchantMessage: 'Almost there — a small tweak to title or description could help clicks.',
      };
    case 'needs-work':
      return {
        light: 'amber',
        grade,
        label: 'Needs work',
        merchantMessage: 'Add or improve your page title and description so people know what to expect.',
      };
    default:
      return {
        light: 'red',
        grade,
        label: 'Fix first',
        merchantMessage: 'Important details are missing — fix this before publishing.',
      };
  }
}

export const TRAFFIC_LIGHT_STYLES: Record<SeoTrafficLight, { dot: string; ring: string; text: string }> = {
  green: { dot: 'bg-green-500', ring: 'ring-green-100', text: 'text-green-700' },
  amber: { dot: 'bg-amber-500', ring: 'ring-amber-100', text: 'text-amber-800' },
  red: { dot: 'bg-red-500', ring: 'ring-red-100', text: 'text-red-700' },
};
