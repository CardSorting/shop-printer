import { ProductDetailPage } from '@ui/pages/product-detail';
import { getServerServices } from '@infrastructure/server/services';
import type { Metadata } from 'next';
import { productToSeoContext } from '@core/seo';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import {
    breadcrumbJsonLd,
    menuItemJsonLd,
    productImages,
    productJsonLd,
    productPath,
} from '@utils/seo';

import { notFound, permanentRedirect } from 'next/navigation';

type Props = {
    params: Promise<{ handle: string }>;
};

const seo = getAppSeoEngine();

async function getProduct(handle: string) {
    const services = await getServerServices();
    try {
        return await services.productService.getProductByHandle(handle);
    } catch {
        try {
            const product = await services.productService.getProduct(handle);
            if (product.handle && product.handle !== handle) {
                permanentRedirect(productPath(product));
            }
            return product;
        } catch {
            return null;
        }
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { handle } = await params;
    const product = await getProduct(handle);

    if (!product) {
        return buildNextPageMetadata(seo.pages.productNotFound(handle), seo.config);
    }

    const input = seo.pages.product(productToSeoContext(product));
    return buildNextPageMetadata({ ...input, images: productImages(product) }, seo.config);
}

export default async function Page({ params }: Props) {
    const { handle } = await params;
    const product = await getProduct(handle);
    if (!product) notFound();

    const jsonLd = [
        breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Hall Favorites', path: '/collections/bestsellers' },
            ...(product.category
                ? [{ name: product.category, path: `/collections/${product.category.toLowerCase().replace(/\s+/g, '-')}` }]
                : []),
            { name: product.name, path: productPath(product) },
        ]),
        productJsonLd(product),
        menuItemJsonLd(product),
    ];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductDetailPage initialProduct={JSON.parse(JSON.stringify(product))} />
        </>
    );
}
