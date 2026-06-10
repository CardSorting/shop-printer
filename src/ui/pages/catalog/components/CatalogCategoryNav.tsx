'use client';

import Link from 'next/link';
import type { ProductCategory } from '@domain/models';
import { STORE_PATHS } from '@utils/navigation';
import { CategoryNavLink } from '../CategoryNavLink';

type CatalogCategoryNavProps = {
  categories: ProductCategory[];
  collectionSlug?: string;
};

export function CatalogCategoryNav({ categories, collectionSlug }: CatalogCategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <div className="mb-12 flex items-center gap-3 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap border-b border-gray-100/60">
      <Link
        href={STORE_PATHS.MENU}
        className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
          !collectionSlug || collectionSlug === 'all'
            ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
            : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        All From the Hall
      </Link>
      {categories.map((cat) => (
        <CategoryNavLink
          key={cat.id}
          href={`/collections/${cat.slug}`}
          isActive={collectionSlug === cat.slug}
        >
          {cat.name}
        </CategoryNavLink>
      ))}
    </div>
  );
}
