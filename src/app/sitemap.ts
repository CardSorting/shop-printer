import { MetadataRoute } from 'next';
import { getServerServices } from '@infrastructure/server/services';
import { getAppSeoEngine } from '@infrastructure/seo';
import { productPath } from '@utils/seo';

function dedupeSitemapRoutes(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const route of routes) {
    const key = route.url.toString();
    if (!seen.has(key)) seen.set(key, route);
  }
  return [...seen.values()];
}

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await getServerServices();
  const seo = getAppSeoEngine();
  const now = new Date();

  const staticRoutes = seo.sitemap.staticRoutes(now);

  const productData = await services.productService.getProducts({ limit: 1000 });
  const productRoutes = productData.products
    .filter((product) => product.status === 'active')
    .map((product) =>
      seo.sitemap.productRoute(
        productPath(product),
        product.updatedAt ? new Date(product.updatedAt) : undefined,
        now
      )
    );

  const categories = await services.taxonomyService.getAllCategories();
  const collectionRoutes = categories.map((category) =>
    seo.sitemap.collectionRoute(
      `/collections/${category.slug}`,
      category.updatedAt ? new Date(category.updatedAt) : undefined,
      now
    )
  );

  const merchCollections = await services.collectionService.list({ status: 'active', limit: 1000 });
  const merchCollectionRoutes = merchCollections.map((collection) =>
    seo.sitemap.collectionRoute(
      `/collections/${collection.handle}`,
      collection.updatedAt ? new Date(collection.updatedAt) : undefined,
      now
    )
  );

  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const { articles } = await services.knowledgebaseRepository.getArticles({
      type: 'blog',
      status: 'published',
      limit: 500,
    });
    articleRoutes = articles.map((article) =>
      seo.sitemap.blogPostRoute(
        `/blog/${article.slug}`,
        article.updatedAt ? new Date(article.updatedAt) : undefined,
        now
      )
    );
  } catch {
    articleRoutes = [];
  }

  let supportArticleRoutes: MetadataRoute.Sitemap = [];
  let supportCategoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const { articles: helpArticles } = await services.knowledgebaseRepository.getArticles({
      type: 'article',
      status: 'published',
      limit: 500,
    });
    supportArticleRoutes = helpArticles.map((article) =>
      seo.sitemap.supportArticleRoute(
        `/support/articles/${article.slug}`,
        article.updatedAt ? new Date(article.updatedAt) : undefined,
        now
      )
    );
  } catch {
    supportArticleRoutes = [];
  }

  try {
    const helpCategories = await services.knowledgebaseRepository.getCategories();
    supportCategoryRoutes = helpCategories.map((category) =>
      seo.sitemap.supportCategoryRoute(`/support/categories/${category.slug}`, undefined, now)
    );
  } catch {
    supportCategoryRoutes = [];
  }

  return dedupeSitemapRoutes([
    ...staticRoutes,
    ...productRoutes,
    ...collectionRoutes,
    ...merchCollectionRoutes,
    ...articleRoutes,
    ...supportArticleRoutes,
    ...supportCategoryRoutes,
  ]);
}
