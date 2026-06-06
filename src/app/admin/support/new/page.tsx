import AdminBlogForm from '@ui/components/AdminBlogForm';

export default function NewHelpArticlePage() {
  return (
    <div className="p-8">
      <AdminBlogForm initialData={{ type: 'article', status: 'draft' }} returnPath="/admin/support" />
    </div>
  );
}
