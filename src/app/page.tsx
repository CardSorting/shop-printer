import { HomePage } from '@ui/pages/HomePage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { homePageJsonLd } from '@utils/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.home(), seo.config);

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homePageJsonLd()) }}
            />
            <HomePage />
        </>
    );
}
