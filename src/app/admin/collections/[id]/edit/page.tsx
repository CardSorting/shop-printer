import { AdminCollectionForm } from '@ui/pages/admin/AdminCollectionForm';

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCollectionForm collectionId={id} />;
}
