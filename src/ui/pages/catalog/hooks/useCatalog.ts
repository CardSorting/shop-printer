'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { sortProducts } from '@utils/sortProducts';
import { useServices } from '../../../hooks/useServices';
import { useCart } from '../../../hooks/useCart';
import type { Product } from '@domain/models';
import { CATALOG_GRID_CLASS, CATALOG_IMAGE_SIZES } from '../constants';
import type { CatalogPageProps, CatalogViewState } from '../types';
import { deriveCatalogViewState } from '../viewState';
import { useCatalogFilters } from './useCatalogFilters';
import { useCatalogGridPreference } from './useCatalogGridPreference';
import { useCatalogInfiniteScroll } from './useCatalogInfiniteScroll';
import { useCatalogMetadata } from './useCatalogMetadata';
import { useCatalogProducts } from './useCatalogProducts';

export function useCatalog(props: CatalogPageProps) {
  const {
    resolvedType,
    resolvedSlug,
    initialProducts,
    initialNextCursor,
    initialCategories,
    initialCollectionInfo,
    initialSortBy,
    initialSearch,
  } = props;

  const services = useServices();
  const { addItem } = useCart();

  const filters = useCatalogFilters(initialSortBy, initialSearch);
  const { gridCols, setGridCols } = useCatalogGridPreference();
  const { categories, collectionInfo, selectedCategories } = useCatalogMetadata({
    initialCategories,
    initialCollectionInfo,
    resolvedType,
    resolvedSlug,
  });

  const productsState = useCatalogProducts({
    productService: services.productService,
    resolvedType,
    collectionSlug: resolvedSlug,
    selectedCategories,
    query: filters.trimmedDebouncedSearch,
    initialProducts,
    initialNextCursor,
  });

  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useCatalogInfiniteScroll({
    sentinelRef: loadMoreSentinelRef,
    nextCursor: productsState.nextCursor,
    trimmedDebouncedSearch: filters.trimmedDebouncedSearch,
    loadingMore: productsState.loadingMore,
    loading: productsState.loading,
    isRefreshing: productsState.isRefreshing,
    loadMoreRef: productsState.loadMoreRef,
    nextCursorRef: productsState.nextCursorRef,
    onLoadMore: productsState.loadMore,
  });

  const visibleProducts = useMemo(
    () => sortProducts(productsState.products, filters.deferredSortBy),
    [productsState.products, filters.deferredSortBy],
  );

  const viewState: CatalogViewState = useMemo(
    () =>
      deriveCatalogViewState({
        loading: productsState.loading,
        isSearchSettling: filters.isSearchSettling,
        error: productsState.error,
        visibleProducts,
        hasSearchQuery: Boolean(filters.trimmedDebouncedSearch),
      }),
    [
      productsState.loading,
      productsState.error,
      filters.isSearchSettling,
      filters.trimmedDebouncedSearch,
      visibleProducts,
    ],
  );

  const isGridUpdating =
    productsState.isRefreshing ||
    filters.isSearchSettling ||
    filters.isSortSettling ||
    filters.isSortPending;

  const gridClass = useMemo(() => CATALOG_GRID_CLASS[gridCols], [gridCols]);
  const productImageSizes = useMemo(() => CATALOG_IMAGE_SIZES[gridCols], [gridCols]);

  const handleQuickAdd = useCallback(async (productId: string) => {
    try {
      await addItem(productId, 1);
      window.dispatchEvent(new CustomEvent('cart:open'));
    } catch (err) {
      console.error('Quick add failed', err);
    }
  }, [addItem]);

  return {
    collectionSlug: resolvedSlug,
    collectionInfo,
    categories,
    filters,
    gridCols,
    setGridCols,
    gridClass,
    productImageSizes,
    visibleProducts,
    viewState,
    isGridUpdating,
    quickViewProduct,
    setQuickViewProduct,
    handleQuickAdd,
    loadMoreSentinelRef,
    ...productsState,
  };
}
