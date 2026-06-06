import { DEFAULT_BLOG_IMAGE, DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';

export const VENDOR_TILES = [
  {
    href: '/collections/artist-cards',
    img: DEFAULT_BLOG_IMAGE,
    span: 'lg:col-span-7 lg:row-span-2',
    aspect: 'aspect-4/5 lg:aspect-auto lg:min-h-[560px]',
    index: '01',
  },
  {
    href: '/collections/prints',
    img: DEFAULT_FOOD_HALL_IMAGE,
    span: 'lg:col-span-5',
    aspect: 'aspect-5/4',
    index: '02',
  },
  {
    href: '/collections/accessories',
    img: DEFAULT_FOOD_HALL_IMAGE,
    span: 'lg:col-span-5',
    aspect: 'aspect-5/4',
    index: '03',
  },
] as const;
