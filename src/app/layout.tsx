import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Fraunces, Inter } from 'next/font/google';
import { AuthProvider } from '@ui/hooks/useAuth';
import { CartProvider } from '@ui/hooks/useCart';
import { WishlistProvider } from '@ui/hooks/useWishlist';
import { ErrorBoundary } from '@ui/components/ErrorBoundary';
import { JsonLd } from '@ui/components/JsonLd';
import { StorefrontShell } from '@ui/layouts/StorefrontShell';
import { CartDrawer } from '@ui/components/CartDrawer';
import { buildRootLayoutMetadata, getAppSeoEngine } from '@infrastructure/seo';
import '@/index.css';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

const fraunces = Fraunces({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-display',
    axes: ['SOFT', 'WONK', 'opsz'],
});

export const metadata: Metadata = buildRootLayoutMetadata(getAppSeoEngine().config);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const nonce = (await headers()).get('x-nonce') ?? '';
    const siteLd = {
        '@context': 'https://schema.org',
        ...getAppSeoEngine().structured.webSite(),
    };

    return (
        <html lang="en" suppressHydrationWarning nonce={nonce || undefined} className={`${inter.variable} ${fraunces.variable}`}>
            <head>
                <link rel="preconnect" href="https://js.stripe.com" />
                <link rel="dns-prefetch" href="https://js.stripe.com" />
                <link rel="preconnect" href="https://api.stripe.com" />
                <meta name="theme-color" content="#111827" />
                <JsonLd data={siteLd} nonce={nonce || undefined} />
            </head>
            <body suppressHydrationWarning className={inter.className}>
                <ErrorBoundary>
                    <AuthProvider>
                        <CartProvider>
                            <WishlistProvider>
                                <StorefrontShell>
                                    <div id="main-content">
                                        {children}
                                    </div>
                                </StorefrontShell>
                                <CartDrawer />
                            </WishlistProvider>
                        </CartProvider>
                    </AuthProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
