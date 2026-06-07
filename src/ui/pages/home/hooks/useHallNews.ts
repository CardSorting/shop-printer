'use client';

import { useEffect, useState } from 'react';
import { useServices } from '@ui/hooks/useServices';
import type { KnowledgebaseArticle } from '@domain/models';

export function useHallNews(limit = 3) {
  const services = useServices();
  const [posts, setPosts] = useState<KnowledgebaseArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const result = await services.knowledgebaseService.getArticles({
          type: 'blog',
          status: 'published',
          limit,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setPosts(result.articles ?? []);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Hall news load failed', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [services, limit]);

  return { posts, loading };
}
