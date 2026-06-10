import { getServerServices } from '@infrastructure/server/services';
import type { Product, ProductCategory } from '@domain/models';
import { sortProducts } from '@utils/sortProducts';

export type CatalogCollectionInfo = {
  name: string;
  description: string;
  imageUrl?: string;
};

export type CatalogBootstrap = {
  products: Product[];
  nextCursor: string | null;
  categories: ProductCategory[];
  collectionInfo: CatalogCollectionInfo | null;
};

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
  const limit = options.limit ?? 20;
  const isCollectionType = options.resolvedType === 'collection';
  const slug = options.collectionSlug;

  const [categories, productResult, collectionInfo] = await Promise.all([
    services.taxonomyService.getAllCategories(),
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
