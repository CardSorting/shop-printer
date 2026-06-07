'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@ui/hooks/useCart';

const CartDrawer = dynamic(
  () => import('@ui/components/CartDrawer').then((m) => ({ default: m.CartDrawer })),
  { ssr: false },
);

export function StorefrontCartDrawer() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { isOpen } = useCart();
  const [ready, setReady] = useState(!isHome);

  useEffect(() => {
    if (!isHome) setReady(true);
  }, [isHome]);

  useEffect(() => {
    if (isOpen) setReady(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isHome || ready) return;

    let cancelled = false;
    const activate = () => {
      if (!cancelled) setReady(true);
    };

    const idleId =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(activate, { timeout: 10_000 })
        : window.setTimeout(activate, 10_000);

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [isHome, ready]);

  if (!ready) return null;
  return <CartDrawer />;
}
