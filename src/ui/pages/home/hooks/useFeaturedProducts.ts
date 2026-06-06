'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useServices } from '@ui/hooks/useServices';
import type { Product } from '@domain/models';

export function useFeaturedProducts(limit = 8) {
  const services = useServices();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const result = await services.productService.getProducts({ limit, signal: controller.signal });
        if (controller.signal.aborted) return;
        setProducts(result.products);
        setNextCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load featured products');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
      loadMoreControllerRef.current?.abort();
    };
  }, [services, limit]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;

    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;

    setLoadingMore(true);
    try {
      const result = await services.productService.getProducts({
        limit,
        cursor: nextCursor,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...result.products.filter((p) => !existingIds.has(p.id))];
      });
      setNextCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Load more failed', err);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [hasMore, limit, loadingMore, nextCursor, services]);

  return { products, loading, loadingMore, hasMore, error, loadMore };
}
