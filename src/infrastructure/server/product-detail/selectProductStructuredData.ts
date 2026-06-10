import type { Product } from '@domain/models';
import type { JsonLd } from '@domain/seo/types';
import {
  breadcrumbJsonLd,
  menuItemJsonLd,
  productJsonLd,
  productPath,
} from '@utils/seo';
import { getCollectionUrl } from '@utils/navigation';

export function selectProductStructuredData(product: Product): JsonLd[] {
  const categoryPath = product.category
    ? getCollectionUrl(product.category)
    : '/collections/bestsellers';

  return [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Hall Favorites', path: '/collections/bestsellers' },
      ...(product.category
        ? [{ name: product.category, path: categoryPath }]
        : []),
      { name: product.name, path: productPath(product) },
    ]),
    productJsonLd(product),
    menuItemJsonLd(product),
  ];
}
