'use client';

/**
 * Create or edit a merchandising collection — includes centralized Search engine listing.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Link as LinkIcon, Save, Sparkles, Tag } from 'lucide-react';
import { useToast, useAdminPageTitle, SkeletonPage } from '../../components/admin/AdminComponents';
import { useServices } from '../../hooks/useServices';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { SeoSettings } from '../../components/admin/SeoSettings';
import { SeoListingNudge } from '../../components/admin/SeoListingNudge';
import { slugify } from '@utils/navigation';
import { scoreCollectionListing } from '@domain/seo/helpers';
import { useSeoListingAudit } from '@ui/hooks/useSeoListingAudit';
import { notifySeoListingChanged } from '@ui/hooks/useSeoCacheInvalidation';

interface AdminCollectionFormProps {
  collectionId?: string;
}

export function AdminCollectionForm({ collectionId }: AdminCollectionFormProps) {
  const isEdit = Boolean(collectionId);
  useAdminPageTitle(isEdit ? 'Edit Collection' : 'Create Collection');
  const router = useRouter();
  const { toast } = useToast();
  const services = useServices();
  const [loading, setLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    status: 'active' as 'active' | 'draft' | 'archived',
  });

  useEffect(() => {
    if (!collectionId) return;
    let active = true;
    services.collectionService
      .get(collectionId)
      .then((collection) => {
        if (!active || !collection) return;
        setFormData({
          name: collection.name,
          handle: collection.handle,
          description: collection.description || '',
          seoTitle: collection.seoTitle || '',
          seoDescription: collection.seoDescription || '',
          status: collection.status,
        });
        setImageUrl(collection.imageUrl || '');
      })
      .catch(() => toast('error', 'Failed to load collection'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [collectionId, services.collectionService, toast]);

  const listingScore = scoreCollectionListing({ ...formData, imageUrl, handle: formData.handle || slugify(formData.name) });
  const { trafficLight, recommendations } = useSeoListingAudit(
    {
      name: formData.name,
      description: formData.description,
      seoTitle: formData.seoTitle,
      seoDescription: formData.seoDescription,
      handle: formData.handle || slugify(formData.name),
      imageUrl,
    },
    'collection'
  );
  const topListingFix = recommendations[0]?.detail ?? recommendations[0]?.title;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalHandle = formData.handle.trim() || slugify(formData.name);
      const payload = {
        ...formData,
        handle: finalHandle,
        imageUrl: imageUrl || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
      };

      if (isEdit && collectionId) {
        await services.collectionService.update(collectionId, payload);
        toast('success', 'Collection updated');
      } else {
        await services.collectionService.create(payload);
        toast('success', 'Collection created');
      }
      notifySeoListingChanged();
      router.push('/admin/collections');
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Failed to save collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <SkeletonPage />;

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-gray-400 shadow-sm transition hover:bg-gray-50 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Merchandising</p>
              <h1 className="text-2xl font-bold text-gray-900">{isEdit ? formData.name || 'Edit collection' : 'Create collection'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save collection' : 'Create collection'}
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Tag className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Collection details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Collection name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="e.g. Patio Favorites"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">URL handle</label>
                  <div className="relative mt-1.5">
                    <LinkIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      name="handle"
                      value={formData.handle}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:bg-white"
                      placeholder="patio-favorites"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="Dishes and drinks perfect for sunny afternoons on the WoodBine patio…"
                  />
                </div>
              </div>
            </div>

            <ImageUpload value={imageUrl} onChange={setImageUrl} folder="collections" label="Featured image" />

            <SeoSettings
              name={formData.name}
              description={formData.description}
              handle={formData.handle}
              seoTitle={formData.seoTitle}
              seoDescription={formData.seoDescription}
              pathPrefix="/collections"
              listingKind="collection"
              imageUrl={imageUrl}
              isEdit={isEdit}
              onChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <LayoutGrid className="h-4 w-4 text-gray-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Publishing</h3>
              </div>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="active">Active (visible)</option>
                <option value="draft">Draft (hidden)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="rounded-2xl border bg-primary-50/50 p-6">
              <Sparkles className="h-5 w-5 text-primary-600" />
              <h3 className="mt-2 text-sm font-bold text-gray-900">Search tip</h3>
              <p className="mt-1 text-xs text-gray-600">
                Collections appear at <span className="font-mono text-[10px]">/collections/your-handle</span> — a strong search listing helps guests discover curated menu groups.
              </p>
            </div>
          </div>
        </div>
      </form>

      <SeoListingNudge score={listingScore} trafficLight={trafficLight} topFix={topListingFix} />
    </>
  );
}

export function AdminCollectionCreate() {
  return <AdminCollectionForm />;
}
