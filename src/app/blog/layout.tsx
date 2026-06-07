import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { blogIndexJsonLd } from '@utils/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.blogIndex(), seo.config);

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={blogIndexJsonLd()} />
      {children}
    </>
  );
}
