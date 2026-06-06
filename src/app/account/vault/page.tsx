import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { DigitalLibraryPage } from '@ui/pages/DigitalLibraryPage';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.accountVault(), seo.config);

export default function Page() {
  return <DigitalLibraryPage />;
}
