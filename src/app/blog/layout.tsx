import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { blogIndexJsonLd } from '@utils/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.blogIndex(), seo.config);

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const blogLd = blogIndexJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
      {children}
    </>
  );
}
