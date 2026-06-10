'use client';

import type { Product } from '@domain/models';

type ProductMetadataProps = {
  product: Product;
  sku?: string;
};

/** Operational product metadata — no SEO assembly (server selectProductSeo only). */
export function ProductMetadata({ product, sku }: ProductMetadataProps) {
  if (!sku && !product.barcode) return null;

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 font-medium">
      {sku && (
        <div>
          <dt className="inline text-gray-400">SKU </dt>
          <dd className="inline text-gray-700">{sku}</dd>
        </div>
      )}
      {product.barcode && (
        <div>
          <dt className="inline text-gray-400">Barcode </dt>
          <dd className="inline text-gray-700">{product.barcode}</dd>
        </div>
      )}
    </dl>
  );
}
