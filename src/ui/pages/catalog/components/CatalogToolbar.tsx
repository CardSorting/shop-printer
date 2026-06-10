'use client';

import { ChevronRight, Grid2X2, Grid3X3, LayoutGrid } from 'lucide-react';
import { CATALOG_SORT_OPTIONS } from '../constants';
import type { CatalogGridCols } from '../types';
import { CatalogSearchBar } from '../CatalogSearchBar';

type CatalogToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  isSearchPending: boolean;
  sortBy: string;
  onSortChange: (value: string) => void;
  gridCols: CatalogGridCols;
  onGridColsChange: (cols: CatalogGridCols) => void;
};

export function CatalogToolbar({
  search,
  onSearchChange,
  isSearchPending,
  sortBy,
  onSortChange,
  gridCols,
  onGridColsChange,
}: CatalogToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row items-center gap-6 mb-16">
      <CatalogSearchBar value={search} onChange={onSearchChange} isPending={isSearchPending} />
      <div className="flex items-center gap-4 w-full lg:w-auto">
        <div className="relative flex-1 lg:flex-none min-w-[240px]">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-10 py-6 bg-gray-50 border-none rounded-3xl font-black text-xs uppercase tracking-widest text-gray-900 appearance-none focus:bg-white focus:ring-4 focus:ring-primary-500/5 outline-none cursor-pointer"
          >
            {CATALOG_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-gray-400 pointer-events-none" />
        </div>

        <div className="hidden lg:flex items-center gap-2 p-1 bg-gray-50 rounded-2xl ml-4">
          <button
            type="button"
            onClick={() => onGridColsChange(2)}
            title="2-column grid view"
            className={`p-3 rounded-xl transition-all ${gridCols === 2 ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid2X2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onGridColsChange(3)}
            title="3-column grid view"
            className={`p-3 rounded-xl transition-all ${gridCols === 3 ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onGridColsChange(4)}
            title="4-column grid view"
            className={`p-3 rounded-xl transition-all ${gridCols === 4 ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
