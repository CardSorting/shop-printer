import { getServerServices } from '@infrastructure/server/services';
import { sortProducts } from '@utils/sortProducts';
import { getCachedCatalogCategories } from './cachedCatalogTaxonomy';
import { CATALOG_SERVER_PAGE_SIZE } from './constants';
import type { CatalogBootstrap, CatalogCollectionInfo } from './types';

export async function loadCatalogBootstrap(options: {
  resolvedType?: 'category' | 'collection';
  collectionSlug?: string;
  query?: string;
  sortBy?: string;
  limit?: number;
  collectionInfo?: CatalogCollectionInfo | null;
}): Promise<CatalogBootstrap> {
  const services = await getServerServices();
  const sortBy = options.sortBy ?? 'newest';
  const limit = options.limit ?? CATALOG_SERVER_PAGE_SIZE;
  const isCollectionType = options.resolvedType === 'collection';
  const slug = options.collectionSlug;

  const [categories, productResult, collectionInfo] = await Promise.all([
    getCachedCatalogCategories(),
    services.productService.getProducts({
      category: !isCollectionType && slug && slug !== 'all' ? [slug] : undefined,
      collection: isCollectionType && slug && slug !== 'all' ? slug : undefined,
      query: options.query?.trim() || undefined,
      limit,
    }),
    options.collectionInfo !== undefined
      ? Promise.resolve(options.collectionInfo)
      : loadCollectionInfo(services, options.resolvedType, slug),
  ]);

  return {
    products: sortProducts(productResult.products, sortBy),
    nextCursor: productResult.nextCursor ?? null,
    categories,
    collectionInfo,
  };
}

async function loadCollectionInfo(
  services: Awaited<ReturnType<typeof getServerServices>>,
  resolvedType?: 'category' | 'collection',
  slug?: string,
): Promise<CatalogCollectionInfo | null> {
  if (!slug || slug === 'all') return null;

  if (resolvedType === 'category') {
    const cat = await services.taxonomyService.getCategoryBySlug(slug);
    return cat ? { name: cat.name, description: cat.description || '' } : null;
  }

  if (resolvedType === 'collection') {
    const col = await services.collectionService.getByHandle(slug);
    return col
      ? { name: col.name, description: col.description || '', imageUrl: col.imageUrl }
      : null;
  }

  return null;
}

export function serializeCatalogBootstrap(bootstrap: CatalogBootstrap): CatalogBootstrap {
  return JSON.parse(JSON.stringify(bootstrap)) as CatalogBootstrap;
}
