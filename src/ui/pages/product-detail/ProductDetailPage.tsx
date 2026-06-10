'use client';

/**
 * [LAYER: UI]
 * ProductDetailPage — Orchestrator
 *
 * Composes PDP sub-components and wires them to useProductDetail.
 * Layout: Gallery | Info | Buy Box
 */
import { useRef } from 'react';
import { useProductDetail } from './hooks/useProductDetail';
import { ProductMediaGallery } from './components/ProductMediaGallery';
import { ProductHero } from './components/ProductHero';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductDescription } from './components/ProductDescription';
import { ProductPurchasePanel } from './components/ProductPurchasePanel';
import { ProductMetadata } from './components/ProductMetadata';
import { RelatedProducts, RecentlyViewed } from './components/RelatedProducts';
import { ProductUnavailable } from './components/ProductUnavailable';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';
import { ProductReviews } from '../../components/ProductReviews';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { getCollectionUrl, STORE_PATHS } from '@utils/navigation';
import type { ProductDetailPageProps } from './types';

export function ProductDetailPage({ product, relatedProducts }: ProductDetailPageProps) {
  const pdp = useProductDetail({ product, relatedProducts });
  const buyBoxRef = useRef<HTMLDivElement>(null);

  if (pdp.viewState.state === 'loading') {
    return <ProductDetailSkeleton />;
  }

  if (pdp.viewState.state === 'not_found') {
    return <ProductUnavailable reason="archived" />;
  }

  if (pdp.viewState.state === 'unavailable' && pdp.viewState.reason === 'archived') {
    return <ProductUnavailable reason="archived" />;
  }

  const isOutOfStock =
    pdp.viewState.state === 'unavailable' && pdp.viewState.reason === 'out_of_stock';

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs
          items={[
            { label: 'Catalog', href: STORE_PATHS.PRODUCTS },
            { label: product.category, href: getCollectionUrl(product.category) },
            { label: product.name },
          ]}
        />

        {isOutOfStock && (
          <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            This item is currently out of stock. Purchase is disabled until inventory returns.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6">
            <ProductMediaGallery
              images={pdp.allImages}
              selectedIndex={pdp.selectedImageIndex}
              onSelect={pdp.setSelectedImageIndex}
              productName={product.name}
            />
          </div>

          <div className="lg:col-span-3 space-y-12">
            <div id="overview" className="scroll-mt-32">
              <ProductHero
                name={product.name}
                vendor={product.vendor}
                category={product.category}
                currentPrice={pdp.currentPrice}
                compareAtPrice={pdp.currentCompareAtPrice}
                description={product.description}
                seoDescription={product.seoDescription}
              />
              <div className="mt-4">
                <ProductMetadata product={product} sku={pdp.currentSku} />
              </div>
            </div>

            {product.hasVariants && product.options && (
              <ProductVariantSelector
                options={product.options}
                selectedOptions={pdp.selectedOptions}
                onSelect={pdp.selectOption}
              />
            )}
          </div>

          <div ref={buyBoxRef} className="lg:col-span-3">
            <ProductPurchasePanel
              currentPrice={pdp.currentPrice}
              compareAtPrice={pdp.currentCompareAtPrice}
              currentStock={pdp.currentStock}
              quantity={pdp.quantity}
              maxSelectableQuantity={pdp.maxSelectableQuantity}
              adding={pdp.adding}
              added={pdp.added}
              cartError={pdp.cartError}
              isFavorite={pdp.isFavorite}
              wishlists={pdp.wishlists}
              showWishlistDropdown={pdp.showWishlistDropdown}
              setShowWishlistDropdown={pdp.setShowWishlistDropdown}
              newCollectionName={pdp.newCollectionName}
              setNewCollectionName={pdp.setNewCollectionName}
              creatingCollection={pdp.creatingCollection}
              onAddToCart={pdp.handleAddToCart}
              onIncrement={pdp.incrementQuantity}
              onDecrement={pdp.decrementQuantity}
              onAddToCollection={pdp.handleAddToCollection}
              onCreateAndAdd={pdp.handleCreateAndAdd}
              onOpenCart={pdp.openCart}
            />
          </div>
        </div>

        <div id="details" className="mt-12 pt-8 border-t border-gray-100 scroll-mt-32">
          <ProductDescription product={product} />
        </div>

        <div id="reviews" className="mt-12 pt-8 border-t border-gray-100 scroll-mt-32">
          <ProductReviews productId={product.id} />
        </div>

        <RelatedProducts products={pdp.relatedProducts} loading={false} />

        <RecentlyViewed products={pdp.recentlyViewed} currentProductId={product.id} />
      </div>
    </div>
  );
}
