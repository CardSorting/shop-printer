'use client';

import { X } from 'lucide-react';

type CatalogActiveSearchProps = {
  query: string;
  onClear: () => void;
};

export function CatalogActiveSearch({ query, onClear }: CatalogActiveSearchProps) {
  if (!query) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2 shrink-0">
        Active Search:
      </div>
      <button
        type="button"
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all border border-transparent shadow-lg shadow-gray-200"
      >
        &quot;{query}&quot; <X className="w-3 h-3" />
      </button>
    </div>
  );
}
