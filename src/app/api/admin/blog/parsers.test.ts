import { describe, expect, it } from 'vitest';
import { parseArticleBatchUpdate, parseArticleIds, parseArticlePayload } from './parsers';

describe('admin blog parsers', () => {
  it('sanitizes article content and normalizes slug before persistence', async () => {
    const article = await parseArticlePayload({
      id: 'post-1',
      title: '<script>alert(1)</script> Safe Title',
      slug: 'Safe Blog Slug!',
      content: '<p>Hello</p><script>alert(1)</script>',
      excerpt: 'Short excerpt',
      type: 'blog',
      status: 'draft',
    });

    expect(article.slug).toBe('safe-blog-slug');
    expect(article.title).not.toContain('<script>');
    expect(article.content).toBe('<p>Hello</p>');
  });

  it('requires scheduledAt when scheduling articles', async () => {
    await expect(parseArticlePayload({
      id: 'post-1',
      title: 'Scheduled',
      slug: 'scheduled',
      content: 'Body',
      status: 'scheduled',
    })).rejects.toThrow('scheduledAt is required');
  });

  it('rejects unsafe batch update fields and oversized batches', async () => {
    await expect(parseArticleBatchUpdate({ slug: 'rewritten' })).rejects.toThrow('supported field');
    expect(() => parseArticleIds(Array.from({ length: 101 }, (_, index) => `post-${index}`))).toThrow('Cannot process more than 100');
  });
});
