'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BottomNav } from '@ui/components/BottomNav';
import { MobileDockProvider, useMobileDock } from '@ui/layouts/MobileDockContext';
import { useCart } from '@ui/hooks/useCart';
import type { ComponentProps } from 'react';

const ConciergeBubble = dynamic(
  () => import('@ui/components/Concierge/ConciergeBubble').then((m) => ({ default: m.ConciergeBubble })),
  { ssr: false },
);

type ConciergeProps = ComponentProps<typeof ConciergeBubble>;

type StorefrontMobileDockProps = {
  showBottomNav: boolean;
  showConcierge: boolean;
  conciergeProps: ConciergeProps;
};

function MobileDockInner({
  showBottomNav,
  showConcierge,
  conciergeProps,
}: StorefrontMobileDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const { chatOpen, setChatOpen } = useMobileDock()!;
  const { isOpen: cartOpen, closeCart } = useCart();

  useEffect(() => {
    if (!cartOpen) return;
    setChatOpen(false);
  }, [cartOpen, setChatOpen]);

  useEffect(() => {
    if (!chatOpen) return;
    closeCart();
  }, [chatOpen, closeCart]);

  useEffect(() => {
    const root = document.documentElement;
    const dock = dockRef.current;
    const nav = navRef.current;

    if (!dock) {
      root.style.removeProperty('--storefront-mobile-dock-height');
      root.style.removeProperty('--storefront-mobile-nav-height');
      root.classList.remove('storefront-mobile-chat-open');
      return;
    }

    const sync = () => {
      root.style.setProperty('--storefront-mobile-dock-height', `${dock.offsetHeight}px`);
      const navHeight = nav?.offsetHeight ?? 0;
      root.style.setProperty('--storefront-mobile-nav-height', navHeight > 0 ? `${navHeight}px` : '4.5rem');
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(dock);
    if (nav) observer.observe(nav);

    return () => {
      observer.disconnect();
      root.style.removeProperty('--storefront-mobile-dock-height');
      root.style.removeProperty('--storefront-mobile-nav-height');
      root.classList.remove('storefront-mobile-chat-open');
    };
  }, [showBottomNav, showConcierge]);

  useEffect(() => {
    document.documentElement.classList.toggle('storefront-mobile-chat-open', chatOpen);
    return () => document.documentElement.classList.remove('storefront-mobile-chat-open');
  }, [chatOpen]);

  if (!showBottomNav && !showConcierge) return null;

  const showChat = showConcierge && !cartOpen;

  return (
    <div
      ref={dockRef}
      id="storefront-mobile-dock"
      data-chat-open={chatOpen ? 'true' : 'false'}
      data-cart-open={cartOpen ? 'true' : 'false'}
      className="storefront-mobile-dock fixed inset-x-0 bottom-0 z-nav lg:hidden"
    >
      <div className="storefront-mobile-dock__grid">
        {showChat ? (
          <div className="storefront-mobile-dock__concierge pointer-events-none px-3 pb-2 pt-1">
            <div className="pointer-events-auto">
              <ConciergeBubble placement="mobile-dock" {...conciergeProps} />
            </div>
          </div>
        ) : (
          <div className="storefront-mobile-dock__concierge-spacer" aria-hidden />
        )}

        {showBottomNav ? (
          <div ref={navRef} className="storefront-mobile-dock__nav">
            <BottomNav embedded compact={chatOpen} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Co-locates mobile bottom nav + chat with measured lanes and no overlap. */
export function StorefrontMobileDock(props: StorefrontMobileDockProps) {
  return (
    <MobileDockProvider>
      <MobileDockInner {...props} />
    </MobileDockProvider>
  );
}
