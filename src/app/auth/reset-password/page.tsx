import { ResetPasswordPage } from '@ui/pages/ResetPasswordPage';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Reset Password | WoodBine',
  description: 'Set a new password for your WoodBine account.',
};

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
