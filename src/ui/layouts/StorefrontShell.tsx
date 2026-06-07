'use client';

/**
 * [LAYER: UI]
 * Conditionally renders storefront chrome (Navbar + Footer) on non-admin pages.
 * Admin pages have their own dedicated layout shell (AdminLayout).
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Navbar } from '@ui/layouts/Navbar';
import { Footer } from '@ui/layouts/Footer';
import { BottomNav } from '@ui/components/BottomNav';
import { StorefrontCartDrawer } from '@ui/layouts/StorefrontCartDrawer';
import { HomeDeferredFooter } from '@ui/pages/home/HomeDeferredFooter';

import { useAuth } from '@ui/hooks/useAuth';
import { useCart } from '@ui/hooks/useCart';

const StorefrontAnimatedMain = dynamic(
  () => import('@ui/layouts/StorefrontAnimatedMain').then((m) => ({ default: m.StorefrontAnimatedMain })),
  { ssr: true },
);

const PageProgressBar = dynamic(
  () => import('@ui/animations/PageProgressBar').then((m) => ({ default: m.PageProgressBar })),
  { ssr: false },
);

const ConciergeBubble = dynamic(
  () => import('@ui/components/Concierge/ConciergeBubble').then((m) => ({ default: m.ConciergeBubble })),
  { ssr: false },
);

export function StorefrontShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { cart } = useCart();
    const isAdmin = pathname.startsWith('/admin');
    const isHome = pathname === '/';
    const [showConcierge, setShowConcierge] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            window.scrollTo(0, 0);
        }
    }, [pathname, isAdmin]);

    useEffect(() => {
        if (isAdmin || !isHome) {
            setShowConcierge(true);
            return;
        }

        let cancelled = false;
        const activate = () => {
            if (!cancelled) setShowConcierge(true);
        };

        const idleId =
            typeof window.requestIdleCallback === 'function'
                ? window.requestIdleCallback(activate, { timeout: 8000 })
                : window.setTimeout(activate, 8000);

        return () => {
            cancelled = true;
            if (typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(idleId as number);
            } else {
                window.clearTimeout(idleId);
            }
        };
    }, [isAdmin, isHome]);

    if (isAdmin) {
        return <>{children}</>;
    }

    const conciergeContext = {
        userSession: user ? {
            id: user.id,
            email: user.email || '',
            name: user.displayName || undefined
        } : undefined,
        cartContents: cart?.items.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.priceSnapshot
        })) || [],
        shippingPolicy: "Standard shipping is 3-5 business days. Free shipping on orders over $50.",
        returnPolicy: "30-day returns on all physical items. Digital products are non-refundable."
    };

    const isProductPage = pathname.startsWith('/products/');
    const productHandle = isProductPage ? pathname.split('/').pop() : undefined;

    const mainClassName = 'relative z-0 w-full flex-1 pb-20 lg:pb-0';

    return (
        <div className={`relative flex min-h-screen flex-col ${isHome ? 'bg-[#0c0b0a]' : 'bg-gray-50'}`}>
            {!isHome && <PageProgressBar />}
            <Navbar />
            {isHome ? (
                <main className={mainClassName}>{children}</main>
            ) : (
                <StorefrontAnimatedMain pathname={pathname} className={mainClassName}>
                    {children}
                </StorefrontAnimatedMain>
            )}
            {isHome ? <HomeDeferredFooter /> : <Footer />}
            <BottomNav />
            <StorefrontCartDrawer />
            {showConcierge && (
                <ConciergeBubble
                    initialContext={conciergeContext}
                    productInfo={productHandle ? { name: productHandle.replace(/-/g, ' '), id: productHandle } : undefined}
                />
            )}
        </div>
    );
}
