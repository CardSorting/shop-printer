'use client';

import { useMemo } from 'react';
import type { ProductCategory } from '@domain/models';
import type { CatalogCollectionInfo, CatalogPageProps } from '../types';

type UseCatalogMetadataOptions = Pick<
  CatalogPageProps,
  'initialCategories' | 'initialCollectionInfo' | 'resolvedType' | 'resolvedSlug'
>;

/**
 * Read-only metadata from server bootstrap.
 * No client-side taxonomy or collection lookups — routes prepare this data.
 */
export function useCatalogMetadata({
  initialCategories,
  initialCollectionInfo,
  resolvedType,
  resolvedSlug,
}: UseCatalogMetadataOptions) {
  const categories = initialCategories;
  const collectionInfo = initialCollectionInfo;

  const selectedCategories = useMemo(() => {
    if (resolvedSlug && resolvedSlug !== 'all' && resolvedType === 'category') {
      return [resolvedSlug];
    }
    return [];
  }, [resolvedSlug, resolvedType]);

  return { categories, collectionInfo, selectedCategories };
}
