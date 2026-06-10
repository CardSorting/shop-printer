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
  viewState: CartViewState;
  loading: boolean;
  refreshing: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      setCart(null);
      return;
    }
    setCart(cartViewToDomain(view));
  }, []);

  const mergeGuestOnLogin = useCallback(async () => {
    const guestCart = loadGuestCart();
    if (!guestCart || guestCart.items.length === 0 || !user) return;

    const mergeResult = await services.cart.mergeGuestItems(guestCartItemsFromCart(guestCart));
    if (!mergeResult.ok) {
      logger.error('Guest cart merge failed', mergeResult.message);
      return;
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
            (line) => line.productId === item.productId && line.variantId === item.variantId,
          );
          return (
            existing ?? {
              productId: item.productId,
              variantId: item.variantId,
              name: item.productId,
              priceSnapshot: 0,
              quantity: item.quantity,
              imageUrl: '',
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
          }
        }
      } else if (isMounted.current) {
        setCart(loadGuestCart());
        setIssues(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      logger.error('Failed to load cart', err);
    } finally {
      if (isMounted.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user, services.cart, syncFromView, mergeGuestOnLogin]);

  const refreshCart = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [cartResult, validationResult] = await Promise.all([
        services.cart.getCart(),
        services.cart.validateCart(),
      ]);

      if (cartResult.ok && isMounted.current) {
        syncFromView(cartResult.data.items.length > 0 ? cartResult.data : null);
      }

      if (validationResult.ok && isMounted.current) {
        setIssues(validationResult.data.valid ? null : validationResult.data.issues);
        if (!validationResult.data.valid) {
          const refreshed = await services.cart.getCart();
          if (refreshed.ok) {
            syncFromView(refreshed.data.items.length > 0 ? refreshed.data : null);
          }
        }
      }
    } catch (err) {
      logger.error('Failed to refresh cart', err);
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

  const addItem = async (productId: string, quantity: number, variantId?: string) => {
    if (user) {
      const result = await services.cart.addItem(productId, quantity, variantId);
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

    const shell = cart ?? loadGuestCart() ?? createGuestCartShell();
    const next = addGuestLineItem(shell, preview.data);
    if (isMounted.current) {
      setCart(next);
      saveGuestCart(next);
      setIsOpen(true);
      emitCartUxEvent({ type: 'cart.item_added', productId, variantId, quantity });
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantId?: string) => {
    if (user) {
      const result = await services.cart.updateItem(productId, quantity, variantId);
      if (!result.ok) throw new Error(result.message);
      if (isMounted.current) {
        syncFromView(result.data);
        emitCartUxEvent({ type: 'cart.item_updated', productId, variantId, quantity });
      }
      return;
    }

    const current = cart ?? loadGuestCart();
    if (!current) return;
    const next = updateGuestLineQuantity(current, productId, quantity, variantId);
    if (isMounted.current) {
      setCart(next);
      saveGuestCart(next);
      emitCartUxEvent({ type: 'cart.item_updated', productId, variantId, quantity });
    }
  };

  const removeItem = async (productId: string, variantId?: string) => {
    if (user) {
      const result = await services.cart.removeItem(productId, variantId);
      if (!result.ok) throw new Error(result.message);
      if (isMounted.current) {
        syncFromView(result.data.items.length > 0 ? result.data : null);
        emitCartUxEvent({ type: 'cart.item_removed', productId, variantId });
      }
      return;
    }

    const current = cart ?? loadGuestCart();
    if (!current) return;
    const next = removeGuestLineItem(current, productId, variantId);
    if (isMounted.current) {
      setCart(next.items.length > 0 ? next : null);
      saveGuestCart(next.items.length > 0 ? next : null);
      emitCartUxEvent({ type: 'cart.item_removed', productId, variantId });
    }
  };

  const clearCart = async () => {
    if (user) {
      const result = await services.cart.clearCart();
      if (!result.ok) throw new Error(result.message);
    }
    if (isMounted.current) {
      setCart(null);
      saveGuestCart(null);
      setIssues(null);
      emitCartUxEvent({ type: 'cart.cleared', userId: user?.id ?? 'guest' });
    }
  };

  const updateNote = async (note: string) => {
    if (user) {
      const result = await services.cart.updateNote(note);
      if (result.ok && isMounted.current) syncFromView(result.data);
      return;
    }

    const current = cart ?? loadGuestCart();
    if (!current) return;
    const next = { ...current, note, updatedAt: new Date() };
    if (isMounted.current) {
      setCart(next);
      saveGuestCart(next);
    }
  };

  const validateCart = async () => {
    await refreshCart();
  };

  const value: CartContextValue = {
    cart,
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
