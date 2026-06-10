'use client';

import { useCallback, useEffect, useState } from 'react';
import { CATALOG_GRID_STORAGE_KEY } from '../constants';
import type { CatalogGridCols } from '../types';

function parseGridCols(value: string | null): CatalogGridCols | null {
  if (value === '2' || value === '3' || value === '4') return Number(value) as CatalogGridCols;
  return null;
}

export function useCatalogGridPreference() {
  const [gridCols, setGridCols] = useState<CatalogGridCols>(3);

  useEffect(() => {
    const saved = parseGridCols(localStorage.getItem(CATALOG_GRID_STORAGE_KEY));
    if (saved) setGridCols(saved);
  }, []);

  const updateGridCols = useCallback((cols: CatalogGridCols) => {
    setGridCols(cols);
    localStorage.setItem(CATALOG_GRID_STORAGE_KEY, String(cols));
  }, []);

  return { gridCols, setGridCols: updateGridCols };
}
