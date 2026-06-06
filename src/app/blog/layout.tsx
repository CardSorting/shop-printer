import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stories from the Hall | WoodBine',
  description: 'Vendor spotlights, community nights, and the people who make WoodBine a neighborhood table in Salt Lake City.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'WoodBine Journal | Stories from the Hall',
    description: 'Meet the vendors, hear from regulars, and see what brings people back under the barrel roof.',
    type: 'website',
    images: ['/og-blog.png'],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
