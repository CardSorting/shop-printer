/**
 * [LAYER: INFRASTRUCTURE]
 */
import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import type { NavigationMenu } from '@domain/models';

function getDefaultMenu(menuId: string): NavigationMenu {
  return {
    id: menuId,
    shopCategories: {
      title: 'Menu',
      links: [
        { label: 'Drinks', href: '/collections/coffee' },
        { label: 'Hearty Plates', href: '/collections/hearty' },
        { label: 'Seasonal', href: '/collections/seasonal' },
      ],
    },
    shopCollections: {
      title: 'Collections',
      links: [
        { label: 'Hall Favorites', href: '/collections/bestsellers' },
        { label: 'Gift Cards', href: '/collections/gifts' },
        { label: 'All Menu Items', href: '/products' },
      ],
    },
    featuredPromotion: {
      imageUrl: '/assets/generated/monetization_blueprint_featured_1778177186388.png',
      title: 'Old Hall. New Flavors.',
      subtitle: 'Walk in — explore every counter',
      linkText: 'View menu',
      linkHref: '/products',
    },
    otherLinks: [{ label: 'Visit & Connect', href: '/support' }],
  } as NavigationMenu;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const menuId = searchParams.get('id') || 'main-nav';

  try {
    const services = await getServerServices();
    const menu = await services.settingsService.getNavigationMenu(menuId);

    if (!menu) {
      return NextResponse.json(getDefaultMenu(menuId));
    }

    return NextResponse.json(menu);
  } catch (error: any) {
    console.warn('Navigation menu fetch failed (returning defaults):', error?.code || error?.message || 'unknown');
    return NextResponse.json(getDefaultMenu(menuId));
  }
}
