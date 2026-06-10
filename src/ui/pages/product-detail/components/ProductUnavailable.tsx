import { STORE_PATHS } from '@utils/navigation';

type ProductUnavailableProps = {
  reason: 'archived' | 'out_of_stock';
};

export function ProductUnavailable({ reason }: ProductUnavailableProps) {
  const isArchived = reason === 'archived';

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl">{isArchived ? '📦' : '⏳'}</span>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-3">
        {isArchived ? 'Product No Longer Available' : 'Currently Out of Stock'}
      </h1>
      <p className="text-gray-500 font-medium mb-8">
        {isArchived
          ? 'This product has been archived and is no longer available for purchase.'
          : 'This item is temporarily out of stock. Check back soon or browse similar items.'}
      </p>
      <a
        href={STORE_PATHS.PRODUCTS}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-black transition-colors"
      >
        Browse Catalog
      </a>
    </div>
  );
}
