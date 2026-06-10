'use client';

import { memo } from 'react';
import { Loader2, Search } from 'lucide-react';

type CatalogSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  isPending?: boolean;
};

export const CatalogSearchBar = memo(function CatalogSearchBar({
  value,
  onChange,
  isPending = false,
}: CatalogSearchBarProps) {
  return (
    <div className="relative flex-1 group w-full">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search catalog..."
        aria-busy={isPending}
        className="w-full pl-16 pr-14 py-6 bg-gray-50 border-none rounded-3xl text-xl font-bold focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
      />
      {isPending && (
        <Loader2
          className="absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400"
          aria-hidden
        />
      )}
    </div>
  );
});
