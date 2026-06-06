'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Pencil, Save } from 'lucide-react';
import type { KnowledgebaseCategory } from '@domain/models';
import { useServices } from '@ui/hooks/useServices';
import { notifySeoListingChanged } from '@ui/hooks/useSeoCacheInvalidation';
import { auditListingSeo } from '@domain/seo/health';
import { SeoStatusBadge } from '@ui/components/admin/SeoStatusBadge';
import Link from 'next/link';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function HelpCategoriesPanel() {
  const services = useServices();
  const [categories, setCategories] = useState<KnowledgebaseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<KnowledgebaseCategory | null>(null);
  const [draft, setDraft] = useState({ name: '', slug: '', description: '' });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await services.knowledgebaseService.getCategories();
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  }, [services.knowledgebaseService]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openEdit = (category: KnowledgebaseCategory) => {
    setEditing(category);
    setDraft({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    });
  };

  const openNew = () => {
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      slug: '',
      description: '',
      articleCount: 0,
    });
    setDraft({ name: '', slug: '', description: '' });
  };

  const handleSave = async () => {
    if (!editing || !draft.name.trim() || !draft.slug.trim()) {
      setError('Name and URL slug are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: KnowledgebaseCategory = {
        id: editing.id,
        name: draft.name.trim(),
        slug: slugify(draft.slug),
        description: draft.description.trim(),
        articleCount: editing.articleCount ?? 0,
        icon: editing.icon,
      };
      await services.knowledgebaseService.saveCategory(payload);
      notifySeoListingChanged();
      setEditing(null);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Search & Visibility</p>
          <h2 className="mt-1 text-xl font-black text-gray-900">Help topics</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Each topic becomes a public page at{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">/support/categories/…</code>. Write descriptions
            that mention WoodBine and Salt Lake — they become the Google preview for that page.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="shrink-0 rounded-xl bg-gray-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-gray-800"
        >
          New topic
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="divide-y rounded-2xl border">
          {categories.map((category) => {
            const seo = auditListingSeo({
              name: category.name,
              description: category.description,
              seoTitle: `${category.name} — Help Center`,
              seoDescription:
                category.description ||
                `${category.name} articles for guests visiting WoodBine food hall in Salt Lake City.`,
              handle: category.slug,
            });
            return (
              <div
                key={category.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{category.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                    {category.description || 'No description — add one for better Google previews.'}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-gray-400">/support/categories/{category.slug}</p>
                  <div className="mt-2">
                    <SeoStatusBadge score={seo.score} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/support/categories/${category.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:bg-primary-50"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-500">No help topics yet. Create your first one above.</p>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900">
              {categories.some((c) => c.id === editing.id) ? 'Edit help topic' : 'New help topic'}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Descriptions drive search previews for the topic page.</p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Topic name</span>
                <input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: prev.slug || slugify(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">URL slug</span>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm outline-none focus:border-primary-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Search description (120–160 characters ideal)
                </span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500"
                  placeholder="Hours, directions, and first-visit tips for WoodBine food hall in Salt Lake City…"
                />
                <p className="mt-1 text-[10px] text-gray-400">{draft.description.length} characters</p>
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save topic
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
