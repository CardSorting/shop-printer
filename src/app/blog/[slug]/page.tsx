import React from 'react';
import { getInitialServices } from '@core/container';
import PostContent from './PostContent';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { absoluteUrl, seoDescription } from '@utils/seo';
import { sanitizeHtml } from '@utils/sanitizer';
import type { Author, BlogComment, KnowledgebaseArticle, Product } from '@domain/models';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  notFound();
}

export default async function BlogPostPage({ params }: Props) {
  notFound();
}
