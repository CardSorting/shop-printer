'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import type { SeoSetupProgress } from '@domain/seo/setup-progress';

interface SeoSetupProgressPanelProps {
  progress: SeoSetupProgress;
}

/** Shopify Setup Guide progress — familiar checklist with next-step CTA */
export function SeoSetupProgressPanel({ progress }: SeoSetupProgressPanelProps) {
  return (
    <section className="rounded-2xl border border-primary-100 bg-linear-to-r from-primary-50/60 to-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900">Setup progress</h2>
          <p className="mt-1 text-xs text-gray-600">
            {progress.completedCount} of {progress.totalCount} visibility tasks complete
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-primary-100">
            <div
              className="h-full bg-primary-600 transition-all duration-700"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-xs font-black text-primary-700">{progress.percent}%</span>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {progress.tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={task.href}
              className={`flex items-start gap-2.5 rounded-xl border p-3 transition hover:shadow-sm ${
                task.done ? 'border-green-100 bg-green-50/40' : 'border-gray-100 bg-white hover:border-primary-200'
              }`}
            >
              {task.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-bold ${task.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {task.label}
                </p>
                {!task.done && <p className="mt-0.5 text-[10px] leading-snug text-gray-500">{task.description}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {progress.nextTask && (
        <Link
          href={progress.nextTask.href}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-black"
        >
          Next: {progress.nextTask.label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}
