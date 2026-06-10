import type { Product } from '@domain/models';

function timeValue(value: Product['createdAt'] | string | number | null | undefined): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function sortProducts(products: Product[], sortBy: string): Product[] {
  const sorted = [...products];
  if (sortBy === 'price_asc') sorted.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  else if (sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
  else if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt) || a.name.localeCompare(b.name));
  return sorted;
}
