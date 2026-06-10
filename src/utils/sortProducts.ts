import type { Product } from '@domain/models';

export function sortProducts(products: Product[], sortBy: string): Product[] {
  const sorted = [...products];
  if (sortBy === 'price_asc') sorted.sort((a, b) => a.price - b.price);
  if (sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price);
  if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}
