import { DomainError } from '@domain/errors';
import type { KnowledgebaseArticle } from '@domain/models';
import { sanitizeHtml } from '@utils/sanitizer';
import {
  optionalBoolean,
  optionalInteger,
  optionalString,
  optionalStringArray,
  requireInteger,
  requireString,
} from '@infrastructure/server/apiGuards';

const ARTICLE_STATUSES = new Set<KnowledgebaseArticle['status']>(['draft', 'review', 'published', 'archived', 'scheduled']);
const ARTICLE_TYPES = new Set<KnowledgebaseArticle['type']>(['article', 'blog']);

export const MAX_BLOG_BATCH_ARTICLES = 100;

function parseStatus(value: unknown, fallback: KnowledgebaseArticle['status'] = 'draft'): KnowledgebaseArticle['status'] {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string' && ARTICLE_STATUSES.has(value as KnowledgebaseArticle['status'])) {
    return value as KnowledgebaseArticle['status'];
  }
  throw new DomainError('Article status is invalid.');
}

function parseType(value: unknown, fallback: KnowledgebaseArticle['type'] = 'blog'): KnowledgebaseArticle['type'] {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string' && ARTICLE_TYPES.has(value as KnowledgebaseArticle['type'])) {
    return value as KnowledgebaseArticle['type'];
  }
  throw new DomainError('Article type is invalid.');
}

function parseDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  if (typeof value !== 'string' && typeof value !== 'number') throw new DomainError(`${field} must be a valid date.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new DomainError(`${field} must be a valid date.`);
  return date;
}

function parseSlug(value: unknown): string {
  const slug = requireString(value, 'slug')
    .toLowerCase()
    .trim()
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new DomainError('slug is required.');
  if (slug.length > 140) throw new DomainError('slug must be 140 characters or fewer.');
  return slug;
}

function optionalUrl(value: unknown, field: string): string | undefined {
  const url = optionalString(value, field);
  if (!url) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return url;
  } catch {
    throw new DomainError(`${field} must be an internal path or HTTPS URL.`);
  }
  throw new DomainError(`${field} must be an internal path or HTTPS URL.`);
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  const parsed = requireInteger(value, field);
  if (parsed < 0) throw new DomainError(`${field} must be non-negative.`);
  return parsed;
}

function optionalNonNegativeInteger(value: unknown, field: string): number | undefined {
  const parsed = optionalInteger(value, field);
  if (parsed === undefined) return undefined;
  if (parsed < 0) throw new DomainError(`${field} must be non-negative.`);
  return parsed;
}

async function cleanHtmlField(value: unknown, field: string, maxLength: number, required = false): Promise<string> {
  const raw = required ? requireString(value, field) : optionalString(value, field) ?? '';
  if (raw.length > maxLength) throw new DomainError(`${field} must be ${maxLength} characters or fewer.`);
  return sanitizeHtml(raw);
}

export async function parseArticlePayload(body: Record<string, unknown>): Promise<KnowledgebaseArticle> {
  const now = new Date();
  const status = parseStatus(body.status);
  const publishedAt = parseDate(body.publishedAt, 'publishedAt') ?? (status === 'published' ? now : undefined);
  const scheduledAt = parseDate(body.scheduledAt, 'scheduledAt');
  if (status === 'scheduled' && !scheduledAt) throw new DomainError('scheduledAt is required for scheduled articles.');

  return {
    id: requireString(body.id, 'id'),
    categoryId: optionalString(body.categoryId, 'categoryId') ?? 'general',
    categoryName: optionalString(body.categoryName, 'categoryName'),
    title: await cleanHtmlField(body.title, 'title', 180, true),
    slug: parseSlug(body.slug),
    content: await cleanHtmlField(body.content, 'content', 120_000, true),
    excerpt: await cleanHtmlField(body.excerpt, 'excerpt', 500),
    authorName: optionalString(body.authorName, 'authorName'),
    authorId: optionalString(body.authorId, 'authorId'),
    viewCount: optionalNonNegativeInteger(body.viewCount, 'viewCount') ?? 0,
    helpfulCount: optionalNonNegativeInteger(body.helpfulCount, 'helpfulCount') ?? 0,
    notHelpfulCount: optionalNonNegativeInteger(body.notHelpfulCount, 'notHelpfulCount') ?? 0,
    tags: optionalStringArray(body.tags, 'tags')?.slice(0, 30),
    type: parseType(body.type),
    status,
    featuredImageUrl: optionalUrl(body.featuredImageUrl, 'featuredImageUrl'),
    featuredImageAlt: optionalString(body.featuredImageAlt, 'featuredImageAlt'),
    relatedProductIds: optionalStringArray(body.relatedProductIds, 'relatedProductIds')?.slice(0, 30),
    isFeatured: optionalBoolean(body.isFeatured, 'isFeatured') ?? false,
    publishedAt,
    scheduledAt,
    metaTitle: optionalString(body.metaTitle, 'metaTitle'),
    metaDescription: optionalString(body.metaDescription, 'metaDescription'),
    canonicalUrl: optionalUrl(body.canonicalUrl, 'canonicalUrl'),
    ogImage: optionalUrl(body.ogImage, 'ogImage'),
    ogTitle: optionalString(body.ogTitle, 'ogTitle'),
    ogDescription: optionalString(body.ogDescription, 'ogDescription'),
    createdAt: parseDate(body.createdAt, 'createdAt') ?? now,
    updatedAt: now,
    seriesId: optionalString(body.seriesId, 'seriesId'),
    seriesPosition: optionalNonNegativeInteger(body.seriesPosition, 'seriesPosition'),
  };
}

export async function parseArticleBatchUpdate(value: unknown): Promise<Partial<KnowledgebaseArticle>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('updates must be an object.');
  }

  const body = value as Record<string, unknown>;
  const updates: Partial<KnowledgebaseArticle> = {};

  if ('status' in body) updates.status = parseStatus(body.status);
  if ('categoryId' in body) updates.categoryId = optionalString(body.categoryId, 'categoryId') ?? 'general';
  if ('authorId' in body) updates.authorId = optionalString(body.authorId, 'authorId');
  if ('authorName' in body) updates.authorName = optionalString(body.authorName, 'authorName');
  if ('isFeatured' in body) updates.isFeatured = optionalBoolean(body.isFeatured, 'isFeatured') ?? false;
  if ('tags' in body) updates.tags = optionalStringArray(body.tags, 'tags')?.slice(0, 30);
  if ('seriesId' in body) updates.seriesId = optionalString(body.seriesId, 'seriesId');
  if ('seriesPosition' in body) updates.seriesPosition = optionalNonNegativeInteger(body.seriesPosition, 'seriesPosition');
  if ('scheduledAt' in body) updates.scheduledAt = parseDate(body.scheduledAt, 'scheduledAt');
  if ('publishedAt' in body) updates.publishedAt = parseDate(body.publishedAt, 'publishedAt');
  if ('featuredImageUrl' in body) updates.featuredImageUrl = optionalUrl(body.featuredImageUrl, 'featuredImageUrl');
  if ('featuredImageAlt' in body) updates.featuredImageAlt = optionalString(body.featuredImageAlt, 'featuredImageAlt');
  if ('metaTitle' in body) updates.metaTitle = optionalString(body.metaTitle, 'metaTitle');
  if ('metaDescription' in body) updates.metaDescription = optionalString(body.metaDescription, 'metaDescription');

  if (Object.keys(updates).length === 0) throw new DomainError('updates must include at least one supported field.');
  if (updates.status === 'scheduled' && !updates.scheduledAt) throw new DomainError('scheduledAt is required when scheduling articles.');
  if (updates.status === 'published' && !updates.publishedAt) updates.publishedAt = new Date();

  return updates;
}

export function parseArticleIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new DomainError('ids must be an array.');
  if (value.length === 0) throw new DomainError('ids must not be empty.');
  if (value.length > MAX_BLOG_BATCH_ARTICLES) throw new DomainError(`Cannot process more than ${MAX_BLOG_BATCH_ARTICLES} articles at once.`);
  return value.map((id, index) => requireString(id, `ids[${index}]`));
}
