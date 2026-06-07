import PostContent from './PostContent';
import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { notFound } from 'next/navigation';
import { getServerServices } from '@infrastructure/server/services';
import { articleToSeoContext } from '@core/seo';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import type { Author, BlogComment, KnowledgebaseArticle, Product } from '@domain/models';
import { blogArticleJsonLd, breadcrumbJsonLd } from '@utils/seo';
import { toIsoDate } from '@domain/seo/rules';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

const seo = getAppSeoEngine();

async function getPublishedBlogPost(slug: string): Promise<KnowledgebaseArticle | null> {
  const services = await getServerServices();
  const post = await services.knowledgebaseRepository.getArticleBySlug(slug);
  if (!post || post.type !== 'blog' || post.status !== 'published') return null;
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);

  if (!post) {
    return buildNextPageMetadata(seo.pages.blogPostNotFound(slug), seo.config);
  }

  const ctx = articleToSeoContext(post);
  const input = seo.pages.blogPost(ctx, post.tags || []);

  return buildNextPageMetadata(
    {
      ...input,
      publishedTime: toIsoDate(post.publishedAt || post.createdAt),
      modifiedTime: toIsoDate(post.updatedAt),
      authors: post.authorName ? [post.authorName] : undefined,
    },
    seo.config
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const services = await getServerServices();
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();

  const [comments, author, latestResult] = await Promise.all([
    services.knowledgebaseRepository.getComments(post.id),
    post.authorId ? services.knowledgebaseRepository.getAuthorById(post.authorId) : Promise.resolve(null),
    services.knowledgebaseRepository.getArticles({ type: 'blog', status: 'published', limit: 4 }),
  ]);

  let relatedProducts: Product[] = [];
  if (post.relatedProductIds?.length) {
    const products = await Promise.all(
      post.relatedProductIds.map((id) =>
        services.productService.getProduct(id).catch(() => null)
      )
    );
    relatedProducts = products.filter((product): product is Product => product !== null);
  }

  const latestPosts = latestResult.articles.filter((article) => article.id !== post.id).slice(0, 3);
  const authorName = (author as Author | null)?.name || post.authorName;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Stories from the Hall', path: '/blog' },
      { name: post.title, path: `/blog/${slug}` },
    ]),
    blogArticleJsonLd(post, authorName),
  ];

  const serializedPost = JSON.parse(JSON.stringify(post)) as KnowledgebaseArticle;
  const serializedComments = JSON.parse(JSON.stringify(comments)) as BlogComment[];
  const serializedAuthor = author ? (JSON.parse(JSON.stringify(author)) as Author) : null;
  const serializedProducts = JSON.parse(JSON.stringify(relatedProducts)) as Product[];
  const serializedLatest = JSON.parse(JSON.stringify(latestPosts)) as KnowledgebaseArticle[];

  return (
    <>
      <JsonLd data={jsonLd} />
      <PostContent
        post={serializedPost}
        initialComments={serializedComments}
        initialAuthor={serializedAuthor}
        initialRelatedProducts={serializedProducts}
        latestPosts={serializedLatest}
      />
    </>
  );
}
