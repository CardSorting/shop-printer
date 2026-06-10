import { unstable_cache } from 'next/cache';
import { getServerServices } from '@infrastructure/server/services';
import type { ProductCategory } from '@domain/models';
import { CATALOG_TAXONOMY_REVALIDATE_SECONDS } from './constants';

export const getCachedCatalogCategories = unstable_cache(
  async (): Promise<ProductCategory[]> => {
    const services = await getServerServices();
    return services.taxonomyService.getAllCategories();
  },
  ['catalog-all-categories'],
  { revalidate: CATALOG_TAXONOMY_REVALIDATE_SECONDS, tags: ['catalog-categories'] },
);
