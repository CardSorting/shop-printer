'use client';

import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CategoryNavLinkProps = {
  href: string;
  isActive: boolean;
  children: ReactNode;
};

export function CategoryNavLink({ href, isActive, children }: CategoryNavLinkProps) {
  const router = useRouter();
  const hasPrefetchedRef = useRef(false);

  const prefetchRoute = useCallback(() => {
    if (isActive || hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    void router.prefetch(href);
  }, [href, isActive, router]);

  return (
    <Link
      href={href}
      prefetch={isActive}
      onPointerEnter={prefetchRoute}
      onFocus={prefetchRoute}
      className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        isActive
          ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </Link>
  );
}
