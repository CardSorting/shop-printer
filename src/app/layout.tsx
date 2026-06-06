import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@ui/hooks/useAuth';
import { CartProvider } from '@ui/hooks/useCart';
import { WishlistProvider } from '@ui/hooks/useWishlist';
import { ErrorBoundary } from '@ui/components/ErrorBoundary';
import { StorefrontShell } from '@ui/layouts/StorefrontShell';
import { CartDrawer } from '@ui/components/CartDrawer';
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_BELONGING_LINE, SITE_COMMUNITY_LINE, SITE_CTA, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@utils/seo';
import '@/index.css';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `WoodBine | ${SITE_TAGLINE}`,
        template: '%s | WoodBine',
    },
    description: `${SITE_DESCRIPTION} ${SITE_BELONGING_LINE}`,
    keywords: ['Food Hall', 'Salt Lake City', 'Community Gathering', 'Local Vendors', 'Third Place', 'Warehouse Dining', 'WoodBine'],
    authors: [{ name: 'WoodBine Team' }],
    creator: 'WoodBine',
    publisher: 'WoodBine',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: '/icon.png',
        shortcut: '/favicon.png',
        apple: '/icon.png',
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: SITE_URL,
        siteName: SITE_NAME,
        title: `WoodBine | ${SITE_TAGLINE}`,
        description: `${SITE_DESCRIPTION} ${SITE_COMMUNITY_LINE}`,
        images: [
            {
                url: absoluteUrl(DEFAULT_OG_IMAGE),
                width: 1200,
                height: 630,
                alt: 'WoodBine Food Hall',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: `WoodBine | ${SITE_TAGLINE}`,
        description: `${SITE_DESCRIPTION} ${SITE_COMMUNITY_LINE}`,
        images: [absoluteUrl(DEFAULT_OG_IMAGE)],
        creator: '@WoodBine',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const searchActionLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_TAGLINE,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <html lang="en" suppressHydrationWarning className={inter.variable}>
            <head>
                <link rel="preconnect" href="https://js.stripe.com" />
                <link rel="dns-prefetch" href="https://js.stripe.com" />
                <link rel="preconnect" href="https://api.stripe.com" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(searchActionLd) }}
                />
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
