import { WishlistPage } from '@ui/pages/WishlistPage';
import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(
  {
    title: 'Saved Items',
    description: 'Your saved menu favorites at WoodBine.',
    path: '/wishlist',
    noIndex: true,
  },
  seo.config
);

export default function Page() {
  return <WishlistPage />;
}
