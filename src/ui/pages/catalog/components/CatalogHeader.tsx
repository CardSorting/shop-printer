'use client';

import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { STORE_PATHS } from '@utils/navigation';
import { SITE_MENU_LINE, SITE_VENDOR_LINE } from '@utils/seo';
import type { CatalogCollectionInfo } from '../types';

type CatalogHeaderProps = {
  collectionInfo: CatalogCollectionInfo | null;
};

export function CatalogHeader({ collectionInfo }: CatalogHeaderProps) {
  return (
    <>
      <Breadcrumbs
        items={
          collectionInfo
            ? [{ label: 'Hall Favorites', href: STORE_PATHS.MENU }, { label: collectionInfo.name }]
            : [{ label: 'Vendors & Menu' }]
        }
      />
      <div className="mb-16">
        <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-6">
          {collectionInfo?.name || 'Vendors & Menu'}
        </h1>
        <div className="h-1.5 w-24 bg-primary-600 rounded-full mb-8" />
        <p className="text-xl text-gray-500 font-medium max-w-2xl leading-relaxed">
          {collectionInfo?.description || `${SITE_VENDOR_LINE} ${SITE_MENU_LINE}`}
        </p>
      </div>
    </>
  );
}
