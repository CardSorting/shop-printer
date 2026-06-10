import { ProductCardSkeleton } from '../components/ProductCard/ProductCardSkeleton';

export function ProductsPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 h-4 w-48 rounded-full honey-shimmer" />

        <div className="mb-16 space-y-6">
          <div className="h-14 w-2/3 max-w-xl rounded-2xl honey-shimmer" />
          <div className="h-1.5 w-24 rounded-full honey-shimmer" />
          <div className="h-6 w-full max-w-2xl rounded-lg honey-shimmer" />
          <div className="h-6 w-4/5 max-w-xl rounded-lg honey-shimmer" />
        </div>

        <div className="mb-12 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-32 shrink-0 rounded-full honey-shimmer" />
          ))}
        </div>

        <div className="mb-16 flex flex-col gap-6 lg:flex-row">
          <div className="h-16 flex-1 rounded-3xl honey-shimmer" />
          <div className="h-16 w-full rounded-3xl honey-shimmer lg:w-64" />
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
