import { ForgotPasswordPage } from '@ui/pages/ForgotPasswordPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.authForgotPassword(), seo.config);

export default function Page() {
  return <ForgotPasswordPage />;
}
