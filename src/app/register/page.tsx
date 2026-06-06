import { RegisterPage } from '@ui/pages/RegisterPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.authRegister(), seo.config);

export default function Page() {
  return <RegisterPage />;
}
