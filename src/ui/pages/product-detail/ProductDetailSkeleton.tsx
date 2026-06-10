/** Canonical PDP loading skeleton — routes/components must not inline skeleton markup. */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-48 bg-gray-200 rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 aspect-4/5 bg-gray-100 rounded-4xl" />
        <div className="lg:col-span-3 space-y-6">
          <div className="h-6 w-24 bg-gray-100 rounded-lg" />
          <div className="h-10 w-3/4 bg-gray-200 rounded-xl" />
          <div className="h-4 w-1/3 bg-gray-100 rounded-lg" />
          <div className="h-24 w-full bg-gray-50 rounded-2xl" />
        </div>
        <div className="lg:col-span-3 h-[500px] bg-gray-50 rounded-4xl border border-gray-100" />
      </div>
    </div>
  );
}
