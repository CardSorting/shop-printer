import { CheckoutPage } from '@ui/pages/CheckoutPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(
  {
    title: 'Checkout',
    description: 'Complete your order at WoodBine food hall.',
    path: '/checkout',
    noIndex: true,
  },
  seo.config
);

export default function Page() {
  return <CheckoutPage />;
}
