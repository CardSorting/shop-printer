import type { Product, ProductCategory } from '@domain/models';

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

export type CatalogFilters = {
  sortBy: string;
  search: string;
};

/** Serializable props for the client catalog page (from server bootstrap). */
export type CatalogPageProps = {
  resolvedType?: 'category' | 'collection';
  resolvedSlug?: string;
  initialProducts: Product[];
  initialNextCursor: string | null;
  initialCategories: ProductCategory[];
  initialCollectionInfo: CatalogCollectionInfo | null;
  initialSortBy: string;
  initialSearch: string;
};

export type PreparedCatalogPage = {
  bootstrap: CatalogBootstrap;
  pageProps: CatalogPageProps;
  lcpImageUrls: string[];
  displayName: string;
  slug?: string;
  cache: {
    key: string;
    ttl: number;
    tags: string[];
  };
};

export type PreparedCatalogPageResult =
  | (PreparedCatalogPage & { notFound: false })
  | { notFound: true; slug?: string };
