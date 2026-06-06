import { Suspense } from 'react';
import { ProductsPage } from '@ui/pages/ProductsPage';
import type { Metadata } from 'next';
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_MENU_LINE, SITE_VENDOR_LINE } from '@utils/seo';

type ProductsProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: ProductsProps): Promise<Metadata> {
    const params = await searchParams;
    const hasFilters = Object.keys(params).length > 0;
    const description = `${SITE_VENDOR_LINE} ${SITE_MENU_LINE}`;

    return {
        title: 'Vendors & Menu | WoodBine — A Neighborhood Table',
        description,
        alternates: {
            canonical: '/products',
        },
        robots: hasFilters
            ? {
                index: false,
                follow: true,
            }
            : undefined,
        openGraph: {
            title: 'Shop WoodBine',
            description,
            type: 'website',
            url: absoluteUrl('/products'),
            images: [absoluteUrl(DEFAULT_OG_IMAGE)],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Shop WoodBine',
            description,
            images: [absoluteUrl(DEFAULT_OG_IMAGE)],
        },
    };
}

export default function Page() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-sm font-bold text-gray-500">Loading catalog...</div>}>
            <ProductsPage />
        </Suspense>
    );
}
