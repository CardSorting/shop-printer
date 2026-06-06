'use client';

import { gradeLabel } from '@domain/seo/health';
import type { SeoGrade } from '@domain/seo/constants';
import { Sparkles, Search } from 'lucide-react';

const GRADE_STYLES: Record<SeoGrade, string> = {
  excellent: 'bg-green-100 text-green-700 border-green-200',
  good: 'bg-amber-100 text-amber-700 border-amber-200',
  'needs-work': 'bg-orange-100 text-orange-800 border-orange-200',
  poor: 'bg-red-100 text-red-700 border-red-200',
};

interface SeoStatusBadgeProps {
  score?: number;
  grade?: SeoGrade;
  compact?: boolean;
}

export function SeoStatusBadge({ score, grade, compact = false }: SeoStatusBadgeProps) {
  const resolvedGrade =
    grade ?? (score !== undefined ? (score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 45 ? 'needs-work' : 'poor') : 'needs-work');
  const optimized = resolvedGrade === 'excellent' || resolvedGrade === 'good';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${GRADE_STYLES[resolvedGrade]}`}
    >
      {optimized ? <Sparkles className="h-3 w-3" /> : <Search className="h-3 w-3" />}
      {compact ? (optimized ? 'OK' : 'Fix') : optimized ? 'Optimized' : 'Needs SEO'}
    </span>
  );
}

export function SeoScoreBadge({ score }: { score: number }) {
  const grade = score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 45 ? 'needs-work' : 'poor';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest ${GRADE_STYLES[grade].split(' ')[1]}`}>
      {score}/100 · {gradeLabel(grade)}
    </span>
  );
}

export { listingGradeLabel } from '@domain/seo/catalog';
