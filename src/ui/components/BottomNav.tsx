'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingBag, Heart, User } from 'lucide-react';
import { useCart } from '../hooks/useCart';

type BottomNavProps = {
  /** Render inside the mobile dock instead of a standalone fixed layer */
  embedded?: boolean;
  /** Tighter layout while chat sheet is open */
  compact?: boolean;
};

export function BottomNav({ embedded = false, compact = false }: BottomNavProps) {
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const isHome = pathname === '/';

  const navItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Search', icon: Search, href: '/search', isSearchTrigger: true },
    { label: 'Wishlist', icon: Heart, href: '/wishlist' },
    { label: 'Account', icon: User, href: '/account' },
  ];

  const bar = (
    <div
      className={`storefront-bottom-nav grid h-[calc(4.5rem+env(safe-area-inset-bottom))] grid-cols-[repeat(4,minmax(0,1fr))_4.75rem] items-end gap-0 px-2 pb-[env(safe-area-inset-bottom)] sm:px-3 transition-colors duration-300 ${
        compact ? 'storefront-bottom-nav--compact' : ''
      } ${
        isHome
          ? 'border-t border-white/10 bg-[#0c0b0a]/90 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl'
          : 'border-t border-gray-100 bg-white/80 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl'
      }`}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`storefront-bottom-nav__item flex min-w-0 flex-col items-center gap-0.5 py-2 transition-all ${
              isHome
                ? isActive
                  ? 'text-primary-400'
                  : 'text-white/45 hover:text-white/85'
                : isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-900'
            }`}
          >
            <div
              className={`relative rounded-2xl p-2 transition-all ${
                isHome
                  ? isActive
                    ? 'bg-white/10'
                    : 'bg-transparent'
                  : isActive
                    ? 'bg-primary-50'
                    : 'bg-transparent'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${compact ? 'sr-only' : ''}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={openCart}
        aria-label={`Open cart${totalItems > 0 ? `, ${totalItems} items` : ''}`}
        className={`storefront-bottom-nav__cart flex flex-col items-center justify-end gap-0.5 py-2 ${
          isHome ? 'text-white/45 hover:text-white/85' : 'text-gray-400 hover:text-gray-900'
        }`}
      >
        <div
          className={`relative rounded-2xl border-4 p-2 shadow-lg ${
            isHome
              ? 'border-[#0c0b0a] bg-white text-gray-900 shadow-black/30'
              : 'border-white bg-gray-900 text-white shadow-gray-200/80'
          }`}
        >
          <ShoppingBag className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-black text-white ring-2 ring-gray-900">
              {totalItems}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${compact ? 'sr-only' : ''}`}>
          Cart
        </span>
      </button>
    </div>
  );

  if (embedded) return bar;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-nav lg:hidden">
      {bar}
    </div>
  );
}
