'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useServices } from '../hooks/useServices';
import { KnowledgebaseArticleList } from '../components/SupportComponents';
import type { KnowledgebaseArticle, KnowledgebaseCategory } from '@domain/models';
import { Loader2, ArrowLeft } from 'lucide-react';

interface SupportCategoryPageProps {
  slug: string;
  initialCategory?: KnowledgebaseCategory | null;
  initialArticles?: KnowledgebaseArticle[];
}

export function SupportCategoryPage({
  slug,
  initialCategory = null,
  initialArticles = [],
}: SupportCategoryPageProps) {
  const [category, setCategory] = useState<KnowledgebaseCategory | null>(initialCategory);
  const [articles, setArticles] = useState<KnowledgebaseArticle[]>(initialArticles);
  const [loading, setLoading] = useState(!initialCategory);
  const services = useServices();
  const router = useRouter();

  useEffect(() => {
    if (initialCategory) return;

    async function load() {
      try {
        const cats = await services.knowledgebaseService.getCategories();
        const cat = cats.find((c: KnowledgebaseCategory) => c.slug === slug || c.id === slug);
        if (cat) {
          setCategory(cat);
          const data = await services.knowledgebaseService.getArticles({ categoryId: cat.id });
          setArticles(data.articles);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slug, services.knowledgebaseService, initialCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <p className="text-sm font-bold text-gray-500">Category not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <button
          type="button"
          onClick={() => router.push('/support')}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 mb-8 transition-colors group"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          Back to Help Center
        </button>
        <KnowledgebaseArticleList
          articles={articles}
          categoryName={category.name}
          onBack={() => router.push('/support')}
        />
      </div>
    </div>
  );
}
