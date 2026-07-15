'use client';

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Eye, Heart, Check } from 'lucide-react';
import { formatCurrency } from '@utils/formatters';
import { useWishlist } from '../../hooks/useWishlist';
import type { Product } from '@domain/models';
import Image from 'next/image';
import { sanitizeImageUrl } from '@utils/imageSanitizer';
import { productTimeValue } from '@utils/sortProducts';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (id: string) => void;
  onQuickView?: (product: Product) => void;
  priority?: boolean;
  imageSizes?: string;
  isFavorited?: boolean;
  onToggleWishlist?: (productId: string) => void | Promise<void>;
}

const STAR_INDICES = [0, 1, 2, 3, 4] as const;

function areProductCardPropsEqual(prev: ProductCardProps, next: ProductCardProps): boolean {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.imageUrl === next.product.imageUrl &&
    prev.product.name === next.product.name &&
    prev.product.compareAtPrice === next.product.compareAtPrice &&
    prev.priority === next.priority &&
    prev.imageSizes === next.imageSizes &&
    prev.isFavorited === next.isFavorited &&
    prev.onAddToCart === next.onAddToCart &&
    prev.onQuickView === next.onQuickView &&
    prev.onToggleWishlist === next.onToggleWishlist
  );
}

const WishlistHeartConnected = memo(function WishlistHeartConnected({ productId }: { productId: string }) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const favorited = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (favorited) await removeFromWishlist(productId);
      else await addToWishlist(productId);
    } catch (err) {
      console.error('Wishlist action failed', err);
    }
  };

  return (
    <button
      onClick={(e) => void handleClick(e)}
      aria-label={favorited ? 'Remove from wishlist' : 'Add to wishlist'}
      className="absolute top-3 right-3 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/95 border border-gray-100 shadow-sm text-gray-500 hover:text-red-500 hover:scale-105 transition-all duration-300"
    >
      <Heart className={`h-4 w-4 transition-colors ${favorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
    </button>
  );
});

function ProductCardInner({
  product,
  onAddToCart,
  onQuickView,
  priority = false,
  imageSizes = '(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(50vw - 3rem), 405px',
  isFavorited,
  onToggleWishlist,
}: ProductCardProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shouldLoadSecondaryImage, setShouldLoadSecondaryImage] = useState(false);
  const isMounted = useRef(true);
  const successTimerRef = useRef<number | null>(null);
  const hasPrefetchedRef = useRef(false);

  const productHref = `/products/${product.handle || product.id}`;
  const usesExternalWishlist = isFavorited !== undefined && onToggleWishlist !== undefined;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);
  
  const isNew = product.tags?.includes('new') || productTimeValue(product.createdAt) > Date.now() - 7 * 24 * 60 * 60 * 1000;
  const isTrending = product.tags?.includes('trending') || product.tags?.includes('popular') || product.tags?.includes('bestseller');
  
  const isOnSale = product.compareAtPrice !== undefined && product.compareAtPrice > product.price;
  const discountPercent = isOnSale ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100) : 0;

  const reviewCount = Number((product as any).reviewCount);
  const averageRating = Number((product as any).averageRating);
  const displayRating = Number.isFinite(averageRating) && Number.isFinite(reviewCount) && reviewCount > 0 ? averageRating : null;

  const secondaryImage = product.media && product.media.length > 1
    ? product.media.find(m => m.position === 2)?.url || product.media[1]?.url
    : null;

  const prefetchProductPage = useCallback(() => {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    void router.prefetch(productHref);
  }, [router, productHref]);

  const primeSecondaryImage = useCallback(() => {
    if (secondaryImage) {
      setShouldLoadSecondaryImage(true);
    }
    prefetchProductPage();
  }, [secondaryImage, prefetchProductPage]);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onToggleWishlist?.(product.id);
    } catch (err) {
      console.error('Wishlist action failed', err);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || showSuccess) return;
    
    setIsAdding(true);
    try {
      await onAddToCart?.(product.id);
      if (isMounted.current) {
        setShowSuccess(true);
        if (successTimerRef.current !== null) {
          window.clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = window.setTimeout(() => {
          if (isMounted.current) setShowSuccess(false);
          successTimerRef.current = null;
        }, 2000);
      }
    } catch (err) {
      console.error('Add to cart failed', err);
    } finally {
      if (isMounted.current) {
        setIsAdding(false);
      }
    }
  };

  const isOutOfStock = product.stock === 0;

  return (
    <div className="group relative flex flex-col h-full bg-white" data-testid="product-card">
      <div
        className="relative aspect-4/5 rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm transition-shadow duration-500 hover:shadow-xl"
        onFocusCapture={primeSecondaryImage}
        onPointerEnter={primeSecondaryImage}
      >
        <Link
          href={productHref}
          prefetch={false}
          className="absolute inset-0 z-10"
          aria-label={`View ${product.name}`}
        >
          <Image
            src={sanitizeImageUrl(product.imageUrl)}
            alt={`${product.name} - Handcrafted ${product.category}`}
            fill
            priority={priority}
            sizes={imageSizes}
            className={`object-cover transition-all duration-700 ${
              secondaryImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'
            }`}
          />
          {secondaryImage && shouldLoadSecondaryImage && (
            <Image
              src={sanitizeImageUrl(secondaryImage)}
              alt={`${product.name} - Alternate view`}
              fill
              sizes={imageSizes}
              loading="lazy"
              className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-in-out group-hover:scale-105"
            />
          )}
        </Link>

        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          {isOnSale && (
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              Sale -{discountPercent}%
            </span>
          )}
          {isNew && (
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              New
            </span>
          )}
          {isTrending && !isOnSale && (
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              Best Seller
            </span>
          )}
        </div>

        {usesExternalWishlist ? (
          <button
            onClick={(e) => void handleWishlist(e)}
            aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/95 border border-gray-100 shadow-sm text-gray-500 hover:text-red-500 hover:scale-105 transition-all duration-300"
          >
            <Heart className={`h-4 w-4 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
          </button>
        ) : (
          <WishlistHeartConnected productId={product.id} />
        )}

        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView?.(product);
          }}
          aria-label="Quick View"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/95 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-black shadow-md flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"
        >
          <Eye className="w-5 h-5" />
        </button>

        <button 
          onClick={handleAddToCart}
          data-testid="quick-add"
          disabled={isAdding || showSuccess || isOutOfStock}
          aria-label={showSuccess ? "Item added to cart" : `Add ${product.name} to cart`}
          className={`absolute bottom-0 inset-x-0 z-20 w-full flex items-center justify-center gap-2 py-3.5 text-xs font-black uppercase tracking-widest transition-all duration-300 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 ${
            showSuccess 
              ? 'bg-green-600 text-white' 
              : isOutOfStock 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-black'
          }`}
        >
          {showSuccess ? (
            <>
              <Check className="w-4 h-4" /> Added!
            </>
          ) : isAdding ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isOutOfStock ? (
            'Sold Out'
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" /> Quick Add
            </>
          )}
        </button>
      </div>

      <div className="mt-4 px-1 flex-1 flex flex-col">
        <div className="h-5 flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {product.category}
          </span>
          <div className="h-1 w-1 rounded-full bg-gray-200" />
          <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest">
             Handcrafted
          </span>
        </div>

        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[2.85rem]">
          <Link
            href={productHref}
            prefetch={false}
            onPointerEnter={prefetchProductPage}
          >
            {product.name}
          </Link>
        </h3>
        
        <div className="h-5 mb-2.5">
          {displayRating ? (
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {STAR_INDICES.map((i) => {
                  const starValue = i + 1;
                  const isFilled = starValue <= Math.round(displayRating);
                  return (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${
                        isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 fill-none'
                      }`} 
                    />
                  );
                })}
              </div>
              <span className="text-xs text-gray-500 font-medium ml-1">
                {displayRating.toFixed(1)} ({reviewCount})
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnSale ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-red-600 tracking-tight">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-xs font-medium text-gray-400 line-through">
                  {formatCurrency(product.compareAtPrice!)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-black text-gray-900 tracking-tight">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            {product.stock <= 5 && product.stock > 0 && (
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight animate-pulse">
                Only {product.stock} left
              </p>
            )}
            {product.stock === 0 && (
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight" data-testid="sold-out-badge">
                Sold Out
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardInner, areProductCardPropsEqual);
