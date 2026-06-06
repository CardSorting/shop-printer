import { getServerServices } from '@infrastructure/server/services';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
    buildPageMetadata,
    menuItemSeoDescription,
    productImages,
    productPath,
    productSeoTitle,
} from '@utils/seo';

type Props = {
    params: Promise<{ slug: string; handle: string }>;
};

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
        return buildPageMetadata({
            title: 'Menu Item Not Found',
            description: 'This dish or menu item is no longer available at WoodBine food hall.',
            path: `/products/${handle}`,
            noIndex: true,
        });
    }

    const description = menuItemSeoDescription(product);
    const title = product.vendor
        ? `${productSeoTitle(product)} — ${product.vendor}`
        : productSeoTitle(product);

    return buildPageMetadata({
        title,
        description,
        path: productPath(product),
        images: productImages(product),
    });
}

export default async function Page({ params }: Props) {
    const { handle } = await params;
    const product = await getProduct(handle);
    if (!product) notFound();
    permanentRedirect(productPath(product));
}
