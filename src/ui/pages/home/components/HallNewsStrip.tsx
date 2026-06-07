'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { useHallNews } from '../hooks/useHallNews';

const { hallNews } = LANDING_COPY;

function formatPostDate(value?: Date | string): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HallNewsStrip() {
  const { posts, loading } = useHallNews(3);

  if (!loading && posts.length === 0) return null;

  return (
    <section className="landing-hall-news" aria-labelledby="hall-news-heading">
      <div className="landing-hall-news__header">
        <div>
          <p className="landing-hall-news__label">{hallNews.label}</p>
          <h2 id="hall-news-heading" className="landing-hall-news__headline font-display">
            {hallNews.headline}
          </h2>
        </div>
        <Link href={hallNews.ctaHref} className="landing-hall-news__cta">
          {hallNews.cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {loading ? (
        <ul className="landing-hall-news__grid" aria-busy="true" aria-label="Loading hall news">
          {[0, 1, 2].map((i) => (
            <li key={i} className="landing-hall-news__skeleton" aria-hidden />
          ))}
        </ul>
      ) : (
        <ul className="landing-hall-news__grid">
          {posts.map((post) => {
            const dateLabel = formatPostDate(post.publishedAt ?? post.createdAt);
            return (
              <li key={post.id}>
                <Link href={`/blog/${post.slug}`} className="landing-hall-news__card group">
                  {dateLabel && <time className="landing-hall-news__date">{dateLabel}</time>}
                  <h3 className="landing-hall-news__title font-display">{post.title}</h3>
                  {post.excerpt && <p className="landing-hall-news__excerpt">{post.excerpt}</p>}
                  <span className="landing-hall-news__read">
                    Read on the bulletin
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
