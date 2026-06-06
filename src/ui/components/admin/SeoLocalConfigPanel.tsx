'use client';

import type { SiteSeoAuditItem } from '@domain/seo/health';
import { LOCAL_ENV_FIELDS, localEnvHintForAudit, buildLocalEnvSnippet, buildProductionEnvTemplate } from '@domain/seo/local-env-config';
import { CheckCircle2, AlertTriangle, Copy, FileText, Sparkles } from 'lucide-react';

interface SeoLocalConfigPanelProps {
  items: SiteSeoAuditItem[];
}

export function SeoLocalConfigPanel({ items }: SeoLocalConfigPanelProps) {
  const doneIds = new Set(items.filter((item) => item.done).map((item) => item.id));
  const incompleteIds = items.filter((item) => !item.done).map((item) => item.id);
  const envSnippet = buildLocalEnvSnippet(incompleteIds);
  const fullTemplate = buildProductionEnvTemplate();

  async function copyFullTemplate() {
    try {
      await navigator.clipboard.writeText(fullTemplate);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function copyEnvSnippet() {
    if (!envSnippet) return;
    try {
      await navigator.clipboard.writeText(envSnippet);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function copyEnvKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="rounded-2xl border bg-gray-900 p-6 text-white shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary-300">Deployment settings</p>
      <h2 className="mt-1 text-sm font-black">Environment variables for local search</h2>
      <p className="mt-2 text-xs leading-relaxed text-gray-300">
        Copy the full template into your hosting dashboard (Vercel → Settings → Environment Variables) or local{' '}
        <code className="rounded bg-white/10 px-1">.env</code> file. Verify the street address and phone before launch.
      </p>
      <button
        type="button"
        onClick={() => void copyFullTemplate()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary-500"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Copy production setup template
      </button>
      <ul className="mt-5 space-y-3">
        {LOCAL_ENV_FIELDS.map((field) => {
          const done = doneIds.has(field.auditId);
          return (
            <li
              key={field.envKey}
              className={`rounded-xl border p-4 ${done ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}
            >
              <div className="flex items-start gap-3">
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{field.label}</p>
                  <button
                    type="button"
                    onClick={() => void copyEnvKey(field.envKey)}
                    className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-primary-200 hover:text-white"
                    title="Copy env var name"
                  >
                    {field.envKey}
                    <Copy className="h-3 w-3 opacity-60" />
                  </button>
                  <p className="mt-1 text-[10px] text-gray-400">Default: {field.defaultValue}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {incompleteIds.length > 0 && (
        <button
          type="button"
          onClick={() => void copyEnvSnippet()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20"
        >
          <FileText className="h-3.5 w-3.5" />
          Copy missing env vars
        </button>
      )}
      <p className="mt-4 text-[10px] text-gray-500">
        Also claim and verify your Google Business Profile — that is separate from these site settings.
      </p>
    </section>
  );
}

/** Resolve env hint for a single audit row (used inline in checklist) */
export function SeoLocalEnvHint({ auditId }: { auditId: string }) {
  const field = localEnvHintForAudit(auditId);
  if (!field) return null;
  return (
    <p className="mt-1 font-mono text-[9px] text-gray-400">
      Set <span className="text-gray-500">{field.envKey}</span> at deploy time
    </p>
  );
}
