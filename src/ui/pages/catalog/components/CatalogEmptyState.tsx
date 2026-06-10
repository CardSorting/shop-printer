'use client';

import { PackageSearch, Store } from 'lucide-react';
import type { CatalogViewState } from '../types';

type CatalogEmptyStateProps = {
  viewState: Extract<CatalogViewState, { state: 'empty' }>;
  onClearSearch?: () => void;
};

export function CatalogEmptyState({ viewState, onClearSearch }: CatalogEmptyStateProps) {
  const isSearchEmpty = viewState.reason === 'no_search_results';

  return (
    <div className="py-32 text-center rounded-[3rem] bg-gray-50 border border-gray-100 px-6">
      <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl mb-8">
        {isSearchEmpty ? (
          <PackageSearch className="h-10 w-10 text-gray-200" />
        ) : (
          <Store className="h-10 w-10 text-gray-200" />
        )}
      </div>
      <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
        {isSearchEmpty ? 'No results matched your search' : 'No products in this collection yet'}
      </h3>
      <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">
        {isSearchEmpty
          ? 'Try broadening your search query to discover more items.'
          : 'Check back soon — new items are added to the hall regularly.'}
      </p>
      {isSearchEmpty && onClearSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}
