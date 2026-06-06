import { ResetPasswordPage } from '@ui/pages/ResetPasswordPage';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(seo.pages.authResetPassword(), seo.config);

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
