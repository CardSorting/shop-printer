import { notFound } from 'next/navigation';
import { prepareProductDetailPage } from '@infrastructure/server/product-detail';
import { CustomizeWorkspaceShell } from '@ui/pages/product-detail';

type Props = {
  params: Promise<{ handle: string }>;
  children: React.ReactNode;
};

export default async function Layout({ params, children }: Props) {
  const { handle } = await params;
  const prepared = await prepareProductDetailPage(handle);

  if (prepared.notFound) {
    notFound();
  }

  return (
    <CustomizeWorkspaceShell product={prepared.pageProps.product}>
      {children}
    </CustomizeWorkspaceShell>
  );
}
