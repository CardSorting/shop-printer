import { LoginPage } from '@ui/pages/LoginPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.authLogin(), seo.config);

export default function Page() {
  return <LoginPage />;
}
