import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { JsonLd } from '@ui/components/JsonLd';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { homePageJsonLd } from '@utils/seo';
import { HomePage } from '@ui/pages/HomePage';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.home(), seo.config);

export default async function Page() {
    const nonce = (await headers()).get('x-nonce') ?? undefined;

    return (
        <>
            <link rel="preload" as="image" href="/images/landing/hero-food-spread.webp" type="image/webp" fetchPriority="high" />
            <JsonLd data={homePageJsonLd()} nonce={nonce} />
            <HomePage />
        </>
    );
}
