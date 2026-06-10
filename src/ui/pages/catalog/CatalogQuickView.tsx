'use client';

import dynamic from 'next/dynamic';
import type { Product } from '@domain/models';
import { useWishlist } from '../../hooks/useWishlist';

const QuickViewModal = dynamic(
  () => import('../../components/QuickViewModal').then((m) => ({ default: m.QuickViewModal })),
  { ssr: false },
);

type CatalogQuickViewProps = {
  product: Product;
  onClose: () => void;
  onAddToCart: (productId: string) => void;
};

export function CatalogQuickView({ product, onClose, onAddToCart }: CatalogQuickViewProps) {
  const wishlist = useWishlist();

  return (
    <QuickViewModal
      product={product}
      onClose={onClose}
      onAddToCart={onAddToCart}
      isFavorited={wishlist.isInWishlist(product.id)}
      onToggleFavorite={async (id) => {
        if (wishlist.isInWishlist(id)) await wishlist.removeFromWishlist(id);
        else await wishlist.addToWishlist(id);
      }}
    />
  );
}
