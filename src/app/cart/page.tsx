import { CartPage } from '@ui/pages/CartPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(
  {
    title: 'Your Cart',
    description: 'Review items before checkout at WoodBine food hall.',
    path: '/cart',
    noIndex: true,
  },
  seo.config
);

export default function Page() {
  return <CartPage />;
}
