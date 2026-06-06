import { ForgotPasswordPage } from '@ui/pages/ForgotPasswordPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | WoodBine',
  description: 'Reset your WoodBine account password.',
};

export default function Page() {
  return <ForgotPasswordPage />;
}
