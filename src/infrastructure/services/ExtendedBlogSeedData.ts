/**
 * [LAYER: INFRASTRUCTURE]
 * Extended WoodBine Stories — seasonal and community-focused articles.
 */

import { DEFAULT_BLOG_IMAGE, DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';

export const EXTENDED_SERIES = [
  {
    id: 'ser-4',
    title: 'Seasonal at the Hall',
    slug: 'seasonal-at-the-hall',
    description: 'Rotating menus, holiday specials, and what\'s new on the counters each season.',
    categoryIds: ['seasonal'],
    articleCount: 2,
    difficulty: 'beginner',
    featuredImageUrl: DEFAULT_FOOD_HALL_IMAGE,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const EXTENDED_POSTS = [
  {
    id: 'blog-5',
    categoryId: 'seasonal',
    title: 'Fall Flavors Worth the Trip to WoodBine',
    slug: 'fall-flavors-woodbine',
    excerpt: 'Hearty bowls, spiced drinks, and comfort food from hall vendors — our autumn must-order list.',
    content: '## Key Takeaways\n\n- Seasonal menus rotate across counters — ask what\'s new this week.\n- Fall is ideal for shared plates and long table hangs.\n- Follow Stories for limited-time drops.\n\n## What to Order\n\nLook for squash soups, braised proteins, and warm spiced beverages across vendors.\n\n## Plan Your Visit\n\nWeekday lunch is relaxed; weekends fill up — come early or grab a seat while your food is prepared.',
    authorName: 'Maya Chen',
    authorId: 'auth-1',
    viewCount: 2900,
    helpfulCount: 134,
    tags: ['seasonal', 'fall', 'menu'],
    type: 'blog',
    status: 'published',
    metaTitle: 'Fall Menu at WoodBine Food Hall',
    metaDescription: 'Seasonal fall dishes and drinks at WoodBine — what to order this autumn in Salt Lake.',
    featuredImageUrl: DEFAULT_FOOD_HALL_IMAGE,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  },
  {
    id: 'blog-6',
    categoryId: 'behind-the-hall',
    title: 'Old Hall, New Flavors: How WoodBine Came to Be',
    slug: 'old-hall-new-flavors-origin',
    excerpt: 'From warehouse to food hall — the story behind restoring a Salt Lake landmark for community dining.',
    content: '## The Building\n\nWoodBine occupies a historic warehouse in the arts district — high ceilings, open floor plan, room for many kitchens.\n\n## The Vision\n\nIndependent vendors, shared seating, and a place where neighbors and visitors eat side by side.\n\n## Today\n\nWe\'re still growing counters and events. Follow along as new flavors join the hall.',
    authorName: 'Sam Ortiz',
    authorId: 'auth-3',
    viewCount: 6100,
    helpfulCount: 302,
    tags: ['woodbine', 'history', 'community'],
    type: 'blog',
    status: 'published',
    metaTitle: 'The Story of WoodBine Food Hall',
    metaDescription: 'How WoodBine turned a Salt Lake warehouse into a community food hall — Old Hall. New Flavors.',
    featuredImageUrl: DEFAULT_BLOG_IMAGE,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  },
];
