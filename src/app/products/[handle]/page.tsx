import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@ui/components/JsonLd';
import { ProductDetailPage, ProductLcpPreload } from '@ui/pages/product-detail';
import {
  prepareProductDetailPage,
  resolveProductSlug,
  selectProductSeo,
  selectProductSeoNotFound,
} from '@infrastructure/server/product-detail';

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const resolved = await resolveProductSlug(handle);

  if (resolved.kind === 'not_found') {
    return selectProductSeoNotFound(handle).metadata;
  }

  return selectProductSeo(resolved.product).metadata;
}

export default async function Page({ params }: Props) {
  const { handle } = await params;
  const prepared = await prepareProductDetailPage(handle);

  if (prepared.notFound) {
    notFound();
  }

  return (
    <>
      <ProductLcpPreload imageUrls={prepared.lcpImageUrls} />
      <JsonLd data={prepared.jsonLd} />
      <ProductDetailPage {...prepared.pageProps} />
    </>
  );
}
