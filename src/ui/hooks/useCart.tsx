'use client';

/**
 * [LAYER: UI]
 * Purchase intent buffer — cart is not truth.
 * Mutations flow through cart protocol; local state mirrors service responses only.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Cart } from '@domain/models';
import { addGuestLineItem, removeGuestLineItem, updateGuestLineQuantity } from '@core/cart/cartMutations';
import { guestCartItemsFromCart } from '@core/cart/mergeGuestCart';
import {
  cartViewToDomain,
  createGuestCartShell,
  deriveCartViewState,
  emitCartUxEvent,
  loadGuestCart,
  saveGuestCart,
  type CartViewState,
} from '@ui/cart';
import { useAuth } from './useAuth';
import { useServices } from './useServices';
import { logger } from '@utils/logger';

export interface CartContextValue {
  cart: Cart | null;
  error: string | null;
  viewState: CartViewState;
  loading: boolean;
  refreshing: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: string, quantity: number, variantId?: string, customImages?: string[]) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string, customImages?: string[]) => Promise<void>;
  removeItem: (productId: string, variantId?: string, customImages?: string[]) => Promise<void>;
  clearCart: () => Promise<void>;
  updateNote: (note: string) => Promise<void>;
  validateCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  subtotal: number;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const services = useServices();
  const [cart, setCart] = useState<Cart | null>(null);
  const [issues, setIssues] = useState<import('@core/cart').CartIssue[] | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const cartRef = useRef<Cart | null>(null);
  const cartOwnerRef = useRef(user?.id ?? 'guest');
  const mutationTailRef = useRef<Promise<void>>(Promise.resolve());

  const commitCart = useCallback((next: Cart | null) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  const enqueueCartMutation = useCallback((operation: () => Promise<void>): Promise<void> => {
    const owner = cartOwnerRef.current;
    const execute = async () => {
      try {
        setCartError(null);
        if (cartOwnerRef.current !== owner) {
          throw new Error('Cart owner changed before the operation could run. Please try again.');
        }
        await operation();
      } catch (error) {
        if (isMounted.current) {
          setCartError(error instanceof Error ? error.message : 'Cart operation failed.');
        }
        throw error;
      }
    };
    const next = mutationTailRef.current.then(execute, execute);
    mutationTailRef.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    cartOwnerRef.current = user?.id ?? 'guest';
  }, [user?.id]);

  const viewState = useMemo(
    () =>
      deriveCartViewState({
        loading,
        cart,
        validation: issues ? { valid: false, issues, requiresRefresh: true } : null,
      }),
    [loading, cart, issues],
  );

  const subtotal = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0) ?? 0,
    [cart],
  );

  const totalItems = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  const syncFromView = useCallback((view: import('@core/cart').CartView | null) => {
    if (!view || view.items.length === 0) {
      commitCart(null);
      return;
    }
    commitCart(cartViewToDomain(view));
  }, [commitCart]);

  const mergeGuestOnLogin = useCallback(async () => {
    const guestCart = loadGuestCart();
    if (!guestCart || guestCart.items.length === 0 || !user) return;

    const mergeResult = await services.cart.mergeGuestItems(guestCartItemsFromCart(guestCart));
    if (!mergeResult.ok) {
      logger.error('Guest cart merge failed', mergeResult.message);
      throw new Error(mergeResult.message);
    }

    if (isMounted.current) {
      syncFromView(mergeResult.data.cart.items.length > 0 ? mergeResult.data.cart : null);
      if (mergeResult.data.mergeIssues.length > 0) {
        setIssues(mergeResult.data.mergeIssues);
      }
    }

    if (mergeResult.data.remainingGuestItems.length === 0) {
      saveGuestCart(null);
    } else {
      saveGuestCart({
        ...guestCart,
        items: mergeResult.data.remainingGuestItems.map((item) => {
          const existing = guestCart.items.find(
            (line) => line.productId === item.productId
              && line.variantId === item.variantId
              && JSON.stringify(line.customImages ?? []) === JSON.stringify(item.customImages ?? []),
          );
          return (
            existing ?? {
              productId: item.productId,
              variantId: item.variantId,
              name: item.productId,
              priceSnapshot: 0,
              quantity: item.quantity,
              imageUrl: '',
              customImages: item.customImages,
            }
          );
        }),
        updatedAt: new Date(),
      });
    }
  }, [user, services.cart, syncFromView]);

  const loadCart = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setCartError(null);
    try {
      if (user) {
        const guestCart = loadGuestCart();
        if (guestCart && guestCart.items.length > 0) {
          await mergeGuestOnLogin();
        } else {
          const result = await services.cart.getCart(controller.signal);
          if (controller.signal.aborted || !isMounted.current) return;
          if (result.ok) {
            syncFromView(result.data.items.length > 0 ? result.data : null);
          } else {
            throw new Error(result.message);
          }
        }
      } else if (isMounted.current) {
        commitCart(loadGuestCart());
        setIssues(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      logger.error('Failed to load cart', err);
      if (isMounted.current) {
        setCartError(err instanceof Error ? err.message : 'Failed to load cart.');
      }
    } finally {
      if (isMounted.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user, services.cart, syncFromView, mergeGuestOnLogin, commitCart]);

  const refreshCart = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setCartError(null);
    try {
      const [cartResult, validationResult] = await Promise.all([
        services.cart.getCart(),
        services.cart.validateCart(),
      ]);
      if (!cartResult.ok) throw new Error(cartResult.message);
      if (!validationResult.ok) throw new Error(validationResult.message);

      if (isMounted.current) {
        syncFromView(cartResult.data.items.length > 0 ? cartResult.data : null);
      }

      if (isMounted.current) {
        setIssues(validationResult.data.valid ? null : validationResult.data.issues);
        if (!validationResult.data.valid) {
          const refreshed = await services.cart.getCart();
          if (!refreshed.ok) throw new Error(refreshed.message);
          syncFromView(refreshed.data.items.length > 0 ? refreshed.data : null);
        }
      }
    } catch (err) {
      logger.error('Failed to refresh cart', err);
      if (isMounted.current) {
        setCartError(err instanceof Error ? err.message : 'Failed to refresh cart.');
      }
    } finally {
      if (isMounted.current) setRefreshing(false);
    }
  }, [user, services.cart, syncFromView]);

  useEffect(() => {
    void loadCart();
    return () => controllerRef.current?.abort();
  }, [loadCart]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleRefresh = () => void refreshCart();

    window.addEventListener('cart:open', handleOpen);
    window.addEventListener('cart:refresh', handleRefresh);

    return () => {
      window.removeEventListener('cart:open', handleOpen);
      window.removeEventListener('cart:refresh', handleRefresh);
    };
  }, [refreshCart]);

  const addItem = (productId: string, quantity: number, variantId?: string, customImages?: string[]) => enqueueCartMutation(async () => {
    if (user) {
      const result = await services.cart.addItem(productId, quantity, variantId, customImages);
      if (!result.ok) throw new Error(result.message);
      if (isMounted.current) {
        syncFromView(result.data);
        setIssues(null);
        setIsOpen(true);
        emitCartUxEvent({ type: 'cart.item_added', productId, variantId, quantity });
      }
      return;
    }

    const preview = await services.cart.previewLineItem(productId, quantity, variantId);
    if (!preview.ok) throw new Error(preview.message);

    const lineItemData = {
      ...preview.data,
      customImages,
    };

    const shell = cartRef.current ?? loadGuestCart() ?? createGuestCartShell();
    const next = addGuestLineItem(shell, lineItemData);
    if (isMounted.current) {
      commitCart(next);
      saveGuestCart(next);
      setIsOpen(true);
      emitCartUxEvent({ type: 'cart.item_added', productId, variantId, quantity });
    }
  });

  const updateQuantity = (productId: string, quantity: number, variantId?: string, customImages?: string[]) => enqueueCartMutation(async () => {
    if (user) {
      const result = await services.cart.updateItem(productId, quantity, variantId, customImages);
      if (!result.ok) throw new Error(result.message);
      if (isMounted.current) {
        syncFromView(result.data);
        emitCartUxEvent({ type: 'cart.item_updated', productId, variantId, quantity });
      }
      return;
    }

    const current = cartRef.current ?? loadGuestCart();
    if (!current) return;
    const next = updateGuestLineQuantity(current, productId, quantity, variantId, customImages);
    if (isMounted.current) {
      commitCart(next);
      saveGuestCart(next);
      emitCartUxEvent({ type: 'cart.item_updated', productId, variantId, quantity });
    }
  });

  const removeItem = (productId: string, variantId?: string, customImages?: string[]) => enqueueCartMutation(async () => {
    if (user) {
      const result = await services.cart.removeItem(productId, variantId, customImages);
      if (!result.ok) throw new Error(result.message);
      if (isMounted.current) {
        syncFromView(result.data.items.length > 0 ? result.data : null);
        emitCartUxEvent({ type: 'cart.item_removed', productId, variantId });
      }
      return;
    }

    const current = cartRef.current ?? loadGuestCart();
    if (!current) return;
    const next = removeGuestLineItem(current, productId, variantId, customImages);
    if (isMounted.current) {
      commitCart(next.items.length > 0 ? next : null);
      saveGuestCart(next.items.length > 0 ? next : null);
      emitCartUxEvent({ type: 'cart.item_removed', productId, variantId });
    }
  });

  const clearCart = () => enqueueCartMutation(async () => {
    if (user) {
      const result = await services.cart.clearCart();
      if (!result.ok) throw new Error(result.message);
    }
    if (isMounted.current) {
      commitCart(null);
      saveGuestCart(null);
      setIssues(null);
      emitCartUxEvent({ type: 'cart.cleared', userId: user?.id ?? 'guest' });
    }
  });

  const updateNote = (note: string) => enqueueCartMutation(async () => {
    if (user) {
      const result = await services.cart.updateNote(note);
      if (!result.ok) throw new Error(result.message);
      if (isMounted.current) syncFromView(result.data);
      return;
    }

    const current = cartRef.current ?? loadGuestCart();
    if (!current) return;
    const next = { ...current, note, updatedAt: new Date() };
    if (isMounted.current) {
      commitCart(next);
      saveGuestCart(next);
    }
  });

  const validateCart = async () => {
    await refreshCart();
  };

  const value: CartContextValue = {
    cart,
    error: cartError,
    viewState,
    loading,
    refreshing,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    updateNote,
    validateCart,
    refreshCart,
    subtotal,
    totalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
