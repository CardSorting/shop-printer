import React from 'react';
import type { KnowledgebaseArticle } from '@domain/models';
import { getAppSeoEngine } from '@infrastructure/seo';
import { SeoListingPreview } from '../admin/SeoListingPreview';

export const SocialPreview: React.FC<{ formData: Partial<KnowledgebaseArticle> }> = ({ formData }) => {
  const seo = getAppSeoEngine();
  const slug = formData.slug || 'story-slug';

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Google & Facebook preview</h4>
        <SeoListingPreview
          input={{
            name: formData.title || 'Post Title',
            description: formData.excerpt,
            seoTitle: formData.metaTitle,
            seoDescription: formData.metaDescription,
            handle: slug,
            pathPrefix: '/blog',
            imageUrl: formData.featuredImageUrl || formData.ogImage,
          }}
          activeChannel="social"
          showTabs={false}
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">X (Twitter) preview</h4>
        <SeoListingPreview
          input={{
            name: formData.title || 'Post Title',
            description: formData.excerpt,
            seoTitle: formData.metaTitle,
            seoDescription: formData.metaDescription,
            handle: slug,
            pathPrefix: '/blog',
            imageUrl: formData.featuredImageUrl || formData.ogImage,
          }}
          activeChannel="twitter"
          showTabs={false}
        />
        {!formData.featuredImageUrl && !formData.ogImage && (
          <p className="text-[10px] text-gray-400">
            Add a featured image for richer social cards on {seo.config.siteName}.
          </p>
        )}
      </div>
    </div>
  );
};
