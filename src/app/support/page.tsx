import { SupportPage } from '@ui/pages/SupportPage';
import { Suspense } from 'react';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { faqPageJsonLd, howToVisitJsonLd } from '@utils/seo';

const seo = getAppSeoEngine();

export const metadata = buildNextPageMetadata(seo.pages.visit(), seo.config);

export default function Page() {
  const faqLd = faqPageJsonLd(seo.visitFaqs());
  const howToLd = howToVisitJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <Suspense fallback={<div className="min-h-screen animate-pulse bg-gray-50" />}>
        <SupportPage />
      </Suspense>
    </>
  );
}
