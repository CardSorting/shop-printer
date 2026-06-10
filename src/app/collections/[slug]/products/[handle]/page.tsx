import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  resolveProductSlug,
  selectProductCanonicalPath,
  selectProductSeo,
  selectProductSeoNotFound,
} from '@infrastructure/server/product-detail';

type Props = {
  params: Promise<{ slug: string; handle: string }>;
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
  const resolved = await resolveProductSlug(handle);

  if (resolved.kind === 'not_found') {
    notFound();
  }

  if (resolved.kind === 'redirect') {
    permanentRedirect(resolved.canonicalPath);
  }

  permanentRedirect(selectProductCanonicalPath(resolved.product));
}
