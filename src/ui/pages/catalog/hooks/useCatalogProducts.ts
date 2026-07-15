'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '@domain/models';
import {
  buildCatalogCacheKey,
  mergeUniqueProducts,
  readCatalogCache,
  writeCatalogCache,
  type CatalogQueryKey,
} from '../catalogCache';
import { CATALOG_PAGE_SIZE } from '../constants';

export type CatalogProductFetcher = {
  getProducts: (options?: {
    category?: string | string[];
    collection?: string;
    query?: string;
    limit?: number;
    cursor?: string;
    signal?: AbortSignal;
  }) => Promise<{ products: Product[]; nextCursor?: string }>;
};

type UseCatalogProductsOptions = {
  productService: CatalogProductFetcher;
  resolvedType?: 'category' | 'collection';
  collectionSlug?: string;
  selectedCategories: string[];
  query: string;
  initialProducts: Product[];
  initialNextCursor: string | null;
  pageSize?: number;
};

export function useCatalogProducts({
  productService,
  resolvedType,
  collectionSlug,
  selectedCategories,
  query,
  initialProducts,
  initialNextCursor,
  pageSize = CATALOG_PAGE_SIZE,
}: UseCatalogProductsOptions) {
  const hasBootstrap = true;

  const queryKey = useMemo<CatalogQueryKey>(
    () => ({
      resolvedType,
      collectionSlug,
      categorySlugs: selectedCategories,
      query,
    }),
    [resolvedType, collectionSlug, selectedCategories, query],
  );
  const cacheKey = useMemo(() => buildCatalogCacheKey(queryKey), [queryKey]);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(!hasBootstrap);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProductsControllerRef = useRef<AbortController | null>(null);
  const skipInitialFetchRef = useRef(hasBootstrap);
  const hasProductsRef = useRef(initialProducts.length > 0);
  const nextCursorRef = useRef<string | null>(initialNextCursor);
  const loadingMoreRef = useRef(false);
  const cacheKeyRef = useRef(cacheKey);

  useEffect(() => {
    cacheKeyRef.current = cacheKey;
    if (hasBootstrap) {
      writeCatalogCache(cacheKey, initialProducts, initialNextCursor);
    }
  }, [cacheKey, hasBootstrap, initialProducts, initialNextCursor]);

  const loadProducts = useCallback(
    async (cursor?: string, { background = false }: { background?: boolean } = {}) => {
      const activeKey = cacheKeyRef.current;

      loadProductsControllerRef.current?.abort();
      const controller = new AbortController();
      loadProductsControllerRef.current = controller;

      if (cursor) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else if (hasProductsRef.current) {
        setIsRefreshing(true);
      } else if (!background) {
        setLoading(true);
      }
      setError(null);

      try {
        const isCollectionType = resolvedType === 'collection';
        const result = await productService.getProducts({
          category: !isCollectionType && selectedCategories.length > 0 ? selectedCategories : undefined,
          collection: isCollectionType && collectionSlug ? collectionSlug : undefined,
          query: query || undefined,
          limit: pageSize,
          cursor,
          signal: controller.signal,
        });

        if (controller.signal.aborted || cacheKeyRef.current !== activeKey) return;

        const newCursor = result.nextCursor ?? null;
        setProducts((prev) => {
          const next = cursor
            ? mergeUniqueProducts(prev, result.products)
            : result.products;
          hasProductsRef.current = next.length > 0;
          writeCatalogCache(activeKey, next, newCursor);
          return next;
        });
        setNextCursor(newCursor);
        nextCursorRef.current = newCursor;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!controller.signal.aborted && cacheKeyRef.current === activeKey) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
        }
      } finally {
        if (!controller.signal.aborted && cacheKeyRef.current === activeKey) {
          setLoading(false);
          loadingMoreRef.current = false;
          setLoadingMore(false);
          setIsRefreshing(false);
        }
      }
    },
    [productService, resolvedType, collectionSlug, selectedCategories, query, pageSize],
  );

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const cached = readCatalogCache(cacheKey);
    if (cached) {
      setProducts(cached.products);
      setNextCursor(cached.nextCursor);
      nextCursorRef.current = cached.nextCursor;
      hasProductsRef.current = cached.products.length > 0;
      void loadProducts(undefined, { background: true });
      return () => loadProductsControllerRef.current?.abort();
    }

    void loadProducts();
    return () => loadProductsControllerRef.current?.abort();
  }, [cacheKey, loadProducts]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const retry = useCallback(() => {
    void loadProducts();
  }, [loadProducts]);

  const loadMore = useCallback(
    (cursor: string) => {
      void loadProducts(cursor);
    },
    [loadProducts],
  );

  return {
    products,
    nextCursor,
    loading,
    loadingMore,
    isRefreshing,
    error,
    retry,
    loadMore,
    loadMoreRef: loadingMoreRef,
    nextCursorRef,
  };
}
