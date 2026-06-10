'use client';

import { useCatalog } from './hooks';
import { CatalogHeader } from './components/CatalogHeader';
import { CatalogCategoryNav } from './components/CatalogCategoryNav';
import { CatalogToolbar } from './components/CatalogToolbar';
import { CatalogActiveSearch } from './components/CatalogActiveSearch';
import { CatalogResults } from './components/CatalogResults';
import { CatalogQuickView } from './CatalogQuickView';
import { CatalogErrorBanner } from './CatalogErrorBanner';
import type { CatalogPageProps } from './types';

export function CatalogPage(props: CatalogPageProps) {
  const catalog = useCatalog(props);

  return (
    <div className="min-h-screen bg-white">
      {catalog.quickViewProduct && (
        <CatalogQuickView
          product={catalog.quickViewProduct}
          onClose={() => catalog.setQuickViewProduct(null)}
          onAddToCart={catalog.handleQuickAdd}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CatalogHeader collectionInfo={catalog.collectionInfo} />
        <CatalogCategoryNav categories={catalog.categories} collectionSlug={catalog.collectionSlug} />
        <CatalogToolbar
          search={catalog.filters.search}
          onSearchChange={catalog.filters.setSearch}
          isSearchPending={catalog.filters.isSearchSettling || (catalog.isRefreshing && catalog.products.length > 0)}
          sortBy={catalog.filters.sortBy}
          onSortChange={catalog.filters.handleSortChange}
          gridCols={catalog.gridCols}
          onGridColsChange={catalog.setGridCols}
        />
        <CatalogActiveSearch
          query={catalog.filters.trimmedDebouncedSearch}
          onClear={() => catalog.filters.setSearch('')}
        />
        {catalog.error && catalog.viewState.state === 'ready' && (
          <div className="mb-8">
            <CatalogErrorBanner message={catalog.error} onRetry={catalog.retry} />
          </div>
        )}
        <CatalogResults
          viewState={catalog.viewState}
          gridClass={catalog.gridClass}
          productImageSizes={catalog.productImageSizes}
          isGridUpdating={catalog.isGridUpdating}
          onRetry={catalog.retry}
          onAddToCart={catalog.handleQuickAdd}
          onQuickView={catalog.setQuickViewProduct}
          onClearSearch={() => catalog.filters.setSearch('')}
          nextCursor={catalog.nextCursor}
          showLoadMore={!catalog.filters.trimmedDebouncedSearch}
          loadingMore={catalog.loadingMore}
          onLoadMore={catalog.loadMore}
          loadMoreSentinelRef={catalog.loadMoreSentinelRef}
        />
      </div>
    </div>
  );
}
