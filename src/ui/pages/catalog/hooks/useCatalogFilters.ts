'use client';

import { useCallback, useDeferredValue, useEffect, useState, useTransition } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { CATALOG_SEARCH_DEBOUNCE_MS } from '../constants';

export function useCatalogFilters(initialSortBy = 'newest', initialSearch = '') {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isSortPending, startSortTransition] = useTransition();
  const deferredSortBy = useDeferredValue(sortBy);
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search, CATALOG_SEARCH_DEBOUNCE_MS);

  const trimmedSearch = search.trim();
  const trimmedDebouncedSearch = debouncedSearch.trim();
  const isSearchSettling = trimmedSearch !== trimmedDebouncedSearch;
  const isSortSettling = sortBy !== deferredSortBy;

  const handleSortChange = useCallback((value: string) => {
    startSortTransition(() => setSortBy(value));
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams();
    if (sortBy !== 'newest') urlParams.set('sort_by', sortBy);
    if (trimmedDebouncedSearch) urlParams.set('q', trimmedDebouncedSearch);

    const queryString = urlParams.toString();
    const currentPath = window.location.pathname;
    const newUrl = queryString ? `${currentPath}?${queryString}` : currentPath;
    const currentUrl = `${currentPath}${window.location.search}`;

    if (newUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', newUrl);
    }
  }, [sortBy, trimmedDebouncedSearch]);

  return {
    sortBy,
    deferredSortBy,
    search,
    setSearch,
    trimmedDebouncedSearch,
    isSearchSettling,
    isSortSettling,
    isSortPending,
    handleSortChange,
  };
}
