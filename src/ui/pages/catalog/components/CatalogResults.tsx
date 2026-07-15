'use client';

import type { RefObject } from 'react';
import type { Product } from '@domain/models';
import { ProductCardSkeleton } from '../../../components/ProductCard/ProductCardSkeleton';
import { CATALOG_INITIAL_SKELETON_COUNT } from '../constants';
import { CatalogErrorBanner } from '../CatalogErrorBanner';
import { CatalogProductGrid } from '../CatalogProductGrid';
import type { CatalogViewState } from '../types';
import { CatalogEmptyState } from './CatalogEmptyState';

type CatalogResultsProps = {
  viewState: CatalogViewState;
  gridClass: string;
  productImageSizes: string;
  isGridUpdating: boolean;
  onRetry: () => void;
  onAddToCart: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onClearSearch: () => void;
  nextCursor: string | null;
  showLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: (cursor: string) => void;
  loadMoreSentinelRef: RefObject<HTMLDivElement>;
};

export function CatalogResults({
  viewState,
  gridClass,
  productImageSizes,
  isGridUpdating,
  onRetry,
  onAddToCart,
  onQuickView,
  onClearSearch,
  nextCursor,
  showLoadMore,
  loadingMore,
  onLoadMore,
  loadMoreSentinelRef,
}: CatalogResultsProps) {
  return (
    <div className="w-full">
      {viewState.state === 'error' && (
        <CatalogErrorBanner message={viewState.message} onRetry={onRetry} />
      )}

      {viewState.state === 'loading' && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridClass} gap-x-8 gap-y-16`}>
          {Array.from({ length: CATALOG_INITIAL_SKELETON_COUNT }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {viewState.state === 'empty' && (
        <CatalogEmptyState viewState={viewState} onClearSearch={onClearSearch} />
      )}

      {viewState.state === 'ready' && (
        <CatalogProductGrid
          products={viewState.products}
          gridClass={gridClass}
          productImageSizes={productImageSizes}
          isUpdating={isGridUpdating}
          onAddToCart={onAddToCart}
          onQuickView={onQuickView}
          nextCursor={nextCursor}
          showLoadMore={showLoadMore}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          loadMoreSentinelRef={loadMoreSentinelRef}
        />
      )}
    </div>
  );
}
