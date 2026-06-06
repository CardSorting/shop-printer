import type { Metadata } from 'next';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { OrderDetailPage } from '@ui/pages/OrderDetailPage';

const seo = getAppSeoEngine();

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildNextPageMetadata(seo.pages.orderDetail(id), seo.config);
}

export default function Page({ params }: Props) {
  return <OrderDetailPage params={params} />;
}
