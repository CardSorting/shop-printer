import { cache } from 'react';
import { getServerServices } from '@infrastructure/server/services';
import type { ProductCategory, Collection } from '@domain/models';

export type ResolvedCatalogSlug =
  | { type: 'category'; data: ProductCategory }
  | { type: 'collection'; data: Collection }
  | null;

/** Dedupes slug resolution within a single request (metadata + page). */
export const resolveCatalogSlug = cache(async (slug: string): Promise<ResolvedCatalogSlug> => {
  const services = await getServerServices();
  try {
    const category = await services.taxonomyService.getCategoryBySlug(slug);
    if (category) return { type: 'category', data: category };

    const collection = await services.collectionService.getByHandle(slug);
    if (collection) return { type: 'collection', data: collection };

    return null;
  } catch {
    return null;
  }
});
