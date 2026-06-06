import { AccountPage } from '@ui/pages/AccountPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(
  {
    title: 'Your Account',
    description: 'Manage your WoodBine account.',
    path: '/account',
    noIndex: true,
  },
  seo.config
);

export default function Page() {
  return <AccountPage />;
}
