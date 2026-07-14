'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '../../../hooks/useCart';
import { useWishlist } from '../../../hooks/useWishlist';
import type { ProductDetailPageProps } from '../types';
import { deriveProductDetailViewState } from '../viewState';
import { useProductAvailability } from './useProductAvailability';
import { useProductMedia } from './useProductMedia';
import { useProductSelection } from './useProductSelection';

function toFriendlyError(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (/insufficient stock/i.test(err.message)) {
      const available = err.message.match(/available\s+(\d+)/i)?.[1];
      return available
        ? `Only ${available} available right now. Please choose a lower quantity.`
        : 'This item has limited availability. Please choose a lower quantity.';
    }
    return err.message;
  }
  return 'Unable to add this item to your cart right now.';
}

/**
 * Master product detail hook — renders bootstrap state only.
 * Purchase actions leave through cart/checkout APIs.
 */
export function useProductDetail({ product, relatedProducts }: ProductDetailPageProps) {
  const { addItem, openCart } = useCart();
  const {
    wishlists,
    isInWishlist,
    addToWishlist,
    createCollection,
    trackView,
    recentlyViewed,
  } = useWishlist();

  const selection = useProductSelection(product);
  const availability = useProductAvailability(product, selection.selectedVariant);
  const media = useProductMedia(product, selection.selectedVariant);

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [showWishlistDropdown, setShowWishlistDropdown] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const isMounted = useRef(true);
  const addedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (addedTimerRef.current !== null) {
        window.clearTimeout(addedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (product) trackView(product);
  }, [product, trackView]);

  const viewState = useMemo(
    () =>
      deriveProductDetailViewState({
        loading: false,
        error: null,
        product,
        purchaseDisabled: availability.purchaseDisabled,
        unavailableReason: availability.unavailableReason,
      }),
    [product, availability.purchaseDisabled, availability.unavailableReason],
  );

  const isFavorite = product?.id ? isInWishlist(product.id) : false;

  const handleAddToCart = useCallback(async (customImages?: string[]) => {
    if (!product || availability.purchaseDisabled) return;
    setAdding(true);
    setCartError(null);
    try {
      await addItem(
        product.id,
        Math.min(selection.quantity, availability.maxSelectableQuantity),
        selection.selectedVariant?.id,
        customImages,
      );
      if (isMounted.current) {
        setAdded(true);
        if (addedTimerRef.current !== null) {
          window.clearTimeout(addedTimerRef.current);
        }
        addedTimerRef.current = window.setTimeout(() => {
          if (isMounted.current) setAdded(false);
          addedTimerRef.current = null;
        }, 2500);
      }
    } catch (err) {
      if (isMounted.current) {
        setCartError(toFriendlyError(err));
      }
    } finally {
      if (isMounted.current) {
        setAdding(false);
      }
    }
  }, [
    product,
    availability.purchaseDisabled,
    availability.maxSelectableQuantity,
    selection.quantity,
    selection.selectedVariant?.id,
    addItem,
  ]);

  async function handleAddToCollection(wishlistId: string) {
    if (!product?.id) return;
    await addToWishlist(product.id, wishlistId);
    setShowWishlistDropdown(false);
  }

  async function handleCreateAndAdd() {
    if (!newCollectionName.trim()) return;
    setCreatingCollection(true);
    try {
      const newList = await createCollection(newCollectionName.trim());
      if (isMounted.current) {
        if (product?.id) await addToWishlist(product.id, newList.id);
        setNewCollectionName('');
        setShowWishlistDropdown(false);
      }
    } finally {
      if (isMounted.current) {
        setCreatingCollection(false);
      }
    }
  }

  function incrementQuantity() {
    selection.setQuantity(
      Math.min(availability.maxSelectableQuantity, selection.quantity + 1),
    );
  }

  function decrementQuantity() {
    selection.setQuantity(Math.max(1, selection.quantity - 1));
  }

  return {
    product,
    relatedProducts,
    recentlyViewed,
    viewState,
    selectedVariant: selection.selectedVariant,
    selectedOptions: selection.selectedOptions,
    selectOption: selection.selectOption,
    quantity: selection.quantity,
    ...availability,
    ...media,
    adding,
    added,
    cartError,
    showWishlistDropdown,
    setShowWishlistDropdown,
    newCollectionName,
    setNewCollectionName,
    creatingCollection,
    isFavorite,
    wishlists,
    handleAddToCart,
    handleAddToCollection,
    handleCreateAndAdd,
    incrementQuantity,
    decrementQuantity,
    openCart,
  };
}
