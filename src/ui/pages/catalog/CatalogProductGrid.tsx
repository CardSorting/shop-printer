'use client';

import { memo, useCallback, useRef, type RefObject } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import type { Product } from '@domain/models';
import { getProductUrl } from '@utils/navigation';
import { ProductCard } from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/ProductCard/ProductCardSkeleton';
import { useWishlist } from '../../hooks/useWishlist';
import {
  CATALOG_LOAD_MORE_SKELETON_COUNT,
  CATALOG_PRIORITY_IMAGE_COUNT,
  CATALOG_STAGGERED_ANIMATION_COUNT,
} from './constants';

type CatalogProductGridProps = {
  products: Product[];
  gridClass: string;
  productImageSizes: string;
  isUpdating: boolean;
  onAddToCart: (productId: string) => void;
  onQuickView: (product: Product) => void;
  nextCursor: string | null;
  showLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: (cursor: string) => void;
  loadMoreSentinelRef: RefObject<HTMLDivElement>;
};

export const CatalogProductGrid = memo(function CatalogProductGrid({
  products,
  gridClass,
  productImageSizes,
  isUpdating,
  onAddToCart,
  onQuickView,
  nextCursor,
  showLoadMore,
  loadingMore,
  onLoadMore,
  loadMoreSentinelRef,
}: CatalogProductGridProps) {
  const { wishlistedProductIds, addToWishlist, removeFromWishlist } = useWishlist();
  const wishlistActionsRef = useRef({ wishlistedProductIds, addToWishlist, removeFromWishlist });
  wishlistActionsRef.current = { wishlistedProductIds, addToWishlist, removeFromWishlist };

  const handleToggleWishlist = useCallback(async (productId: string) => {
    const { wishlistedProductIds: ids, addToWishlist: add, removeFromWishlist: remove } = wishlistActionsRef.current;
    if (ids.has(productId)) await remove(productId);
    else await add(productId);
  }, []);

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-400 tracking-tight">
          Showing <span className="text-gray-900">{products.length}</span> items
        </p>
        {isUpdating && (
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating
          </span>
        )}
      </div>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${gridClass} gap-x-8 gap-y-16 transition-opacity duration-200 ${
          isUpdating ? 'opacity-75' : 'opacity-100'
        }`}
        itemScope
        itemType="https://schema.org/ItemList"
        aria-busy={isUpdating}
      >
        <meta itemProp="numberOfItems" content={products.length.toString()} />
        {products.map((p, i) => (
          <div
            key={p.id}
            className={`h-full [content-visibility:auto] [contain-intrinsic-size:0_520px] ${
              i < CATALOG_STAGGERED_ANIMATION_COUNT ? 'animate-in fade-in duration-300 fill-mode-both' : ''
            }`}
            style={i < CATALOG_STAGGERED_ANIMATION_COUNT ? { animationDelay: `${i * 40}ms` } : undefined}
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <meta itemProp="position" content={(i + 1).toString()} />
            <meta itemProp="name" content={p.name} />
            <link itemProp="url" href={getProductUrl(p)} />
            <ProductCard
              product={p}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
              priority={i < CATALOG_PRIORITY_IMAGE_COUNT}
              imageSizes={productImageSizes}
              isFavorited={wishlistedProductIds.has(p.id)}
              onToggleWishlist={handleToggleWishlist}
            />
          </div>
        ))}
        {loadingMore &&
          Array.from({ length: CATALOG_LOAD_MORE_SKELETON_COUNT }).map((_, i) => (
            <ProductCardSkeleton key={`loading-more-${i}`} />
          ))}
      </div>

      {showLoadMore && nextCursor && (
        <div ref={loadMoreSentinelRef} className="mt-20 text-center" aria-hidden={!loadingMore}>
          {loadingMore ? (
            <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more items
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onLoadMore(nextCursor)}
              className="inline-flex items-center gap-3 rounded-4xl bg-gray-900 px-12 py-5 font-black text-xs uppercase tracking-widest text-white shadow-2xl transition hover:bg-black hover:-translate-y-1 active:translate-y-0"
            >
              Load More Items <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </>
  );
});
