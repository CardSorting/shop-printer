import { HomePage } from '@ui/pages/HomePage';
import type { Metadata } from 'next';
import { absoluteUrl, DEFAULT_OG_IMAGE, organizationJsonLd, SITE_BELONGING_LINE, SITE_DESCRIPTION, SITE_TAGLINE } from '@utils/seo';

export const metadata: Metadata = {
    title: `WoodBine | ${SITE_TAGLINE}`,
    description: `${SITE_DESCRIPTION} ${SITE_BELONGING_LINE}`,
    openGraph: {
        title: `WoodBine | ${SITE_TAGLINE}`,
        description: SITE_DESCRIPTION,
        type: 'website',
        url: absoluteUrl('/'),
        images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    alternates: {
        canonical: '/',
    },
};

export default function Page() {
    const organizationLd = organizationJsonLd();

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
            />
            <HomePage />
        </>
    );
}
