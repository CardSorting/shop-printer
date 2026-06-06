import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerServices } from '@infrastructure/server/services';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, itemListJsonLd } from '@utils/seo';
import { SupportCategoryPage } from '@ui/pages/SupportCategoryPage';
import type { KnowledgebaseArticle, KnowledgebaseCategory } from '@domain/models';

export const dynamic = 'force-dynamic';

const seo = getAppSeoEngine();

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCategoryWithArticles(slug: string) {
  const services = await getServerServices();
  const categories = await services.knowledgebaseRepository.getCategories();
  const category = categories.find((c) => c.slug === slug || c.id === slug);
  if (!category) return null;

  const { articles } = await services.knowledgebaseRepository.getArticles({
    categoryId: category.id,
    type: 'article',
    status: 'published',
    limit: 100,
  });

  return { category, articles };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategoryWithArticles(slug);

  if (!result) {
    return buildNextPageMetadata(
      {
        title: 'Help Category Not Found',
        description: 'This help category is no longer available.',
        path: `/support/categories/${slug}`,
        noIndex: true,
      },
      seo.config
    );
  }

  return buildNextPageMetadata(seo.pages.supportCategory(result.category), seo.config);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const result = await getCategoryWithArticles(slug);
  if (!result) notFound();

  const { category, articles } = result;
  const categoryPath = `/support/categories/${slug}`;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Visit & Connect', path: '/support' },
      { name: category.name, path: categoryPath },
    ]),
    itemListJsonLd(
      category.name,
      categoryPath,
      articles.map((article) => ({
        name: article.title,
        path: `/support/articles/${article.slug}`,
      }))
    ),
  ];

  const serializedCategory = JSON.parse(JSON.stringify(category)) as KnowledgebaseCategory;
  const serializedArticles = JSON.parse(JSON.stringify(articles)) as KnowledgebaseArticle[];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SupportCategoryPage
        slug={slug}
        initialCategory={serializedCategory}
        initialArticles={serializedArticles}
      />
    </>
  );
}
