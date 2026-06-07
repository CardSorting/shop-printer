import { SupportPage } from '@ui/pages/SupportPage';
import { Suspense } from 'react';
import { JsonLd } from '@ui/components/JsonLd';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { getServerServices } from '@infrastructure/server/services';
import { breadcrumbJsonLd, faqPageJsonLd, howToVisitJsonLd, itemListJsonLd } from '@utils/seo';

export const dynamic = 'force-dynamic';

const seo = getAppSeoEngine();

export const metadata = buildNextPageMetadata(seo.pages.visit(), seo.config);

export default async function Page() {
  const services = await getServerServices();
  const categories = await services.knowledgebaseRepository.getCategories().catch(() => []);

  const faqLd = faqPageJsonLd(seo.visitFaqs());
  const howToLd = howToVisitJsonLd();
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Visit & Connect', path: '/support' },
  ]);
  const categoryListLd =
    categories.length > 0
      ? itemListJsonLd(
          'Help center topics',
          '/support',
          categories.map((category) => ({
            name: category.name,
            path: `/support/categories/${category.slug}`,
          }))
        )
      : null;

  const jsonLd = [breadcrumbLd, faqLd, howToLd, categoryListLd].filter(Boolean);

  return (
    <>
      <JsonLd data={jsonLd as Record<string, unknown>[]} />
      <Suspense fallback={<div className="min-h-screen animate-pulse bg-gray-50" />}>
        <SupportPage />
      </Suspense>
    </>
  );
}
