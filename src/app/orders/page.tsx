import { OrdersPage } from '@ui/pages/OrdersPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(
  {
    title: 'Your Orders',
    description: 'View order history at WoodBine food hall.',
    path: '/orders',
    noIndex: true,
  },
  seo.config
);

export default function Page() {
  return <OrdersPage />;
}
