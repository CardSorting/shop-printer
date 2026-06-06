'use client';

/**
 * Centralized listing audit for product, blog, and collection editors.
 */
import { useMemo } from 'react';
import { getAppSeoEngine } from '@infrastructure/seo';
import type { ListingSeoInput } from '@domain/seo/health';

export type SeoListingKind = 'product' | 'blog' | 'collection' | 'homepage';

export function useSeoListingAudit(input: ListingSeoInput, kind: SeoListingKind) {
  const { name, description, seoTitle, seoDescription, handle, imageUrl } = input;

  return useMemo(() => {
    const seo = getAppSeoEngine();
    return seo.adminReport.auditListingForKind(
      { name, description, seoTitle, seoDescription, handle, imageUrl },
      kind
    );
  }, [name, description, seoTitle, seoDescription, handle, imageUrl, kind]);
}
