import type { MetadataRoute } from 'next';
import { getSeoConfig } from '@infrastructure/seo';
import { SITE_DESCRIPTION } from '@domain/seo/brand';

export default function manifest(): MetadataRoute.Manifest {
  const config = getSeoConfig();
  return {
    name: `${config.siteName} — ${config.tagline}`,
    short_name: config.siteName,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    lang: 'en-US',
    categories: ['food', 'lifestyle'],
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
