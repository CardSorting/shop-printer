'use client';

import { useEffect, type RefObject } from 'react';
import { CATALOG_INFINITE_SCROLL_ROOT_MARGIN } from '../constants';

type UseCatalogInfiniteScrollOptions = {
  sentinelRef: RefObject<HTMLDivElement | null>;
  nextCursor: string | null;
  trimmedDebouncedSearch: string;
  loadingMore: boolean;
  loading: boolean;
  isRefreshing: boolean;
  loadMoreRef: React.MutableRefObject<boolean>;
  nextCursorRef: React.MutableRefObject<string | null>;
  onLoadMore: (cursor: string) => void;
};

export function useCatalogInfiniteScroll({
  sentinelRef,
  nextCursor,
  trimmedDebouncedSearch,
  loadingMore,
  loading,
  isRefreshing,
  loadMoreRef,
  nextCursorRef,
  onLoadMore,
}: UseCatalogInfiniteScrollOptions) {
  useEffect(() => {
    if (!nextCursor || trimmedDebouncedSearch || loadingMore || loading || isRefreshing) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadMoreRef.current) return;
        const cursor = nextCursorRef.current;
        if (cursor) onLoadMore(cursor);
      },
      { rootMargin: CATALOG_INFINITE_SCROLL_ROOT_MARGIN },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    nextCursor,
    trimmedDebouncedSearch,
    loadingMore,
    loading,
    isRefreshing,
    onLoadMore,
    loadMoreRef,
    nextCursorRef,
    sentinelRef,
  ]);
}
