"use client";

/**
 * [LAYER: UI]
 * Collections — menu grouping and merchandising for WoodBine
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  LayoutGrid,
  Filter,
  Globe,
} from 'lucide-react';
import { 
  AdminPageHeader, 
  AdminEmptyState, 
  SkeletonPage,
  useToast,
  useAdminPageTitle,
  AdminStatusBadge
} from '../../components/admin/AdminComponents';
import type { Collection } from '@domain/models';
import { useServices } from '../../hooks/useServices';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sanitizeImageUrl } from '@utils/sanitizer';
import { SeoStatusBadge } from '../../components/admin/SeoStatusBadge';
import { collectionNeedsSeoAttention, scoreCollectionListing } from '@domain/seo/helpers';
import { parseSeoNeedsWorkFilter } from '@domain/seo/admin-routes';
import { SeoListingsAlert } from '../../components/admin/SeoListingsAlert';

export function AdminCollections() {
  useAdminPageTitle('Collections');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const services = useServices();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [seoFilterOnly, setSeoFilterOnly] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (parseSeoNeedsWorkFilter(searchParams)) {
      setSeoFilterOnly(true);
    }
  }, [searchParams]);

  const fetchCollections = async () => {
    try {
      const data = await services.collectionService.list();
      setCollections(data);
    } catch (error) {
      toast('error', 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const seoNeedsCount = useMemo(
    () => collections.filter((c) => collectionNeedsSeoAttention(c)).length,
    [collections]
  );

  const filteredCollections = collections.filter(c => {
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    const matchesQuery = !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.handle.includes(query.toLowerCase());
    const matchesSeo = !seoFilterOnly || collectionNeedsSeoAttention(c);
    return matchesStatus && matchesQuery && matchesSeo;
  });

  if (loading && collections.length === 0) return <SkeletonPage />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <AdminPageHeader 
        title="Collections" 
        subtitle="Curated menu groups — appetizers, drinks, seasonal picks, and more."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/seo?tab=listings"
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <Globe className="h-4 w-4" /> Search & Visibility
            </Link>
            <Link 
              href="/admin/collections/new"
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Create collection
            </Link>
          </div>
        }
      />

      {seoNeedsCount > 0 && <SeoListingsAlert needsWork={seoNeedsCount} compact />}

      <div className="grid gap-4 sm:grid-cols-4">
        <button 
          onClick={() => { setStatusFilter('all'); setSeoFilterOnly(false); }}
          className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'all' && !seoFilterOnly ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500' : 'bg-white hover:border-gray-300'}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{collections.length}</p>
        </button>
        <button 
          onClick={() => { setStatusFilter('active'); setSeoFilterOnly(false); }}
          className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'active' ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500' : 'bg-white hover:border-gray-300'}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{collections.filter(c => c.status === 'active').length}</p>
        </button>
        <button 
          onClick={() => { setStatusFilter('draft'); setSeoFilterOnly(false); }}
          className={`rounded-2xl border p-4 text-left transition ${statusFilter === 'draft' ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500' : 'bg-white hover:border-gray-300'}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Drafts</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{collections.filter(c => c.status === 'draft').length}</p>
        </button>
        <button 
          onClick={() => setSeoFilterOnly(!seoFilterOnly)}
          className={`rounded-2xl border p-4 text-left transition ${seoFilterOnly ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500' : 'bg-white hover:border-gray-300'}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Needs SEO</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{seoNeedsCount}</p>
        </button>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter collections..."
              className="w-full rounded-xl border bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSeoFilterOnly(!seoFilterOnly)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                seoFilterOnly ? 'border-amber-200 bg-amber-50 text-amber-800' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" /> Search listing
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredCollections.map(collection => (
            <div
              key={collection.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/admin/collections/${collection.id}/edit`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/admin/collections/${collection.id}/edit`);
                }
              }}
              className="group flex cursor-pointer items-center justify-between p-4 transition hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-xl border bg-gray-50 relative">
                  {collection.imageUrl ? (
                    <Image 
                      src={sanitizeImageUrl(collection.imageUrl)} 
                      alt="" 
                      fill 
                      className="object-cover" 
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <LayoutGrid className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{collection.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-mono font-medium text-gray-400">/{collection.handle}</span>
                    <AdminStatusBadge status={collection.status} type="generic" />
                    <SeoStatusBadge score={scoreCollectionListing(collection)} compact />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/admin/collections/${collection.id}/edit`}
                  className="rounded-lg border bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 shadow-sm transition"
                >
                  Edit listing
                </Link>
                <button type="button" className="rounded-lg p-2 text-gray-400 hover:text-gray-900 transition"><MoreHorizontal className="h-5 w-5" /></button>
              </div>
            </div>
          ))}

          {filteredCollections.length === 0 && !loading && (
            <AdminEmptyState 
              title={seoFilterOnly ? 'All collections pass SEO checklist' : 'No collections found'} 
              description={seoFilterOnly ? 'Every collection in this view has a solid search listing.' : 'Create curated groups to help guests browse the menu.'} 
              icon={LayoutGrid} 
              action={
                !seoFilterOnly ? (
                  <Link 
                    href="/admin/collections/new"
                    className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 active:scale-95"
                  >
                    <Plus className="h-4 w-4" /> Create your first collection
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
