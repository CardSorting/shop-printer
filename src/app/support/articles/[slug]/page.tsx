import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerServices } from '@infrastructure/server/services';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, helpArticleJsonLd } from '@utils/seo';
import { SupportArticlePage } from '@ui/pages/SupportArticlePage';
import type { KnowledgebaseArticle } from '@domain/models';

export const dynamic = 'force-dynamic';

const seo = getAppSeoEngine();

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPublishedSupportArticle(slug: string) {
  const services = await getServerServices();
  const article = await services.knowledgebaseRepository.getArticleBySlug(slug);
  if (!article || article.status !== 'published' || article.type === 'blog') return null;
  return article;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedSupportArticle(slug);

  if (!article) {
    return buildNextPageMetadata(seo.pages.supportArticleNotFound(slug), seo.config);
  }

  const input = seo.pages.supportArticle(article);
  return buildNextPageMetadata(input, seo.config);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const services = await getServerServices();
  const article = await getPublishedSupportArticle(slug);
  if (!article) notFound();

  const relatedResult = await services.knowledgebaseRepository.getArticles({
    categoryId: article.categoryId,
    type: 'article',
    status: 'published',
    limit: 4,
  });
  const related = relatedResult.articles.filter((a) => a.id !== article.id).slice(0, 3);

  const categories = await services.knowledgebaseRepository.getCategories();
  const category = categories.find((c) => c.id === article.categoryId);

  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Visit & Connect', path: '/support' },
  ];
  if (category) {
    breadcrumbItems.push({
      name: category.name,
      path: `/support/categories/${category.slug}`,
    });
  }
  breadcrumbItems.push({ name: article.title, path: `/support/articles/${slug}` });

  const jsonLd = [breadcrumbJsonLd(breadcrumbItems), helpArticleJsonLd(article)];

  const serializedArticle = JSON.parse(JSON.stringify(article)) as KnowledgebaseArticle;
  const serializedRelated = JSON.parse(JSON.stringify(related)) as KnowledgebaseArticle[];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SupportArticlePage
        slug={slug}
        initialArticle={serializedArticle}
        initialRelated={serializedRelated}
      />
    </>
  );
}
