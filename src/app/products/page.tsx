import { Suspense } from 'react';
import { ProductsPage } from '@ui/pages/ProductsPage';
import type { Metadata } from 'next';
import { getServerServices } from '@infrastructure/server/services';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, itemListJsonLd } from '@utils/seo';

type ProductsProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const seo = getAppSeoEngine();

export async function generateMetadata({ searchParams }: ProductsProps): Promise<Metadata> {
    const params = await searchParams;
    const hasFilters = Object.keys(params).length > 0;
    return buildNextPageMetadata(seo.pages.menu(hasFilters), seo.config);
}

export default async function Page() {
    const services = await getServerServices();
    const categories = await services.taxonomyService.getAllCategories();
    const menuItems = categories.slice(0, 12).map((category) => ({
        name: category.name,
        path: `/collections/${category.slug}`,
    }));

    const jsonLd = [
        breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Vendors & Menu', path: '/products' },
        ]),
        itemListJsonLd('WoodBine Vendors & Menu', '/products', menuItems.length ? menuItems : [
            { name: 'All Vendors & Menu', path: '/collections/all' },
        ]),
    ];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-sm font-bold text-gray-500">Loading menu...</div>}>
                <ProductsPage />
            </Suspense>
        </>
    );
}
