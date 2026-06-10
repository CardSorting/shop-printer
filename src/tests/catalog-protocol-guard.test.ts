import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG_SERVER_PAGE_SIZE } from '@infrastructure/server/catalog/constants';
import { CATALOG_PAGE_SIZE, CATALOG_INITIAL_SKELETON_COUNT } from '@ui/pages/catalog/constants';
import { CATALOG_LCP_PRELOAD_COUNT } from '@infrastructure/server/catalog/lcp';

const CATALOG_ROUTES = [
  'src/app/collections/[slug]/page.tsx',
  'src/app/search/page.tsx',
];

const CATALOG_ROUTE_ROOTS = [
  path.join(process.cwd(), 'src/app/collections'),
  path.join(process.cwd(), 'src/app/search'),
];

const CATALOG_UI_ROOT = path.join(process.cwd(), 'src/ui/pages/catalog');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function collectTsSources(root: string): Array<{ file: string; source: string }> {
  const files: Array<{ file: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      if (entry.name.endsWith('.test.ts')) continue;
      files.push({
        file: path.relative(process.cwd(), full),
        source: fs.readFileSync(full, 'utf8'),
      });
    }
  };
  walk(root);
  return files;
}

describe('Catalog protocol guard (storefront read boundary)', () => {
  it('[routes] catalog routes import only @infrastructure/server/catalog', () => {
    for (const route of CATALOG_ROUTES) {
      const source = read(route);
      expect(source, route).toMatch(/@infrastructure\/server\/catalog/);
      expect(source, route).not.toMatch(/@infrastructure\/server\/loadCatalogBootstrap/);
      expect(source, route).not.toMatch(/@infrastructure\/server\/resolveCatalogSlug/);
      expect(source, route).not.toMatch(/@infrastructure\/server\/cachedCatalogTaxonomy/);
    }
  });

  it('[routes] catalog routes import UI only from @ui/pages/catalog', () => {
    for (const route of CATALOG_ROUTES) {
      const source = read(route);
      expect(source, route).toMatch(/@ui\/pages\/catalog/);
      expect(source, route).not.toMatch(/@ui\/pages\/ProductsPage/);
    }
  });

  it('[routes] catalog routes use prepareCatalogPage', () => {
    for (const route of CATALOG_ROUTES) {
      const source = read(route);
      expect(source, route).toMatch(/prepareCatalogPage/);
      expect(source, route).not.toMatch(/loadCatalogBootstrap\s*\(/);
      expect(source, route).not.toMatch(/readCatalogFilters\s*\(/);
    }
  });

  it('[routes] no route duplicates slug/filter/bootstrap assembly', () => {
    for (const root of CATALOG_ROUTE_ROOTS) {
      for (const { file, source } of collectTsSources(root)) {
        expect(source, file).not.toMatch(/serializeCatalogBootstrap/);
        expect(source, file).not.toMatch(/getCachedCatalogCategories/);
      }
    }
  });

  it('[ui] catalog components do not define local debounce/cache/skeleton constants', () => {
    const forbidden = [
      /debounce.*=\s*300/,
      /CACHE_TTL/,
      /SKELETON_COUNT\s*=\s*\d+/,
      /rootMargin:\s*['"]\d+px/,
    ];
    for (const { file, source } of collectTsSources(CATALOG_UI_ROOT)) {
      if (
        file.endsWith('constants.ts') ||
        file.endsWith('catalogCache.ts') ||
        file.endsWith('index.ts')
      ) {
        continue;
      }
      for (const pattern of forbidden) {
        expect(source, `${file} must not define ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('[ui] metadata hook does not fetch taxonomy or collection APIs', () => {
    const source = read('src/ui/pages/catalog/hooks/useCatalogMetadata.ts');
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/getCategoryBySlug/);
    expect(source).not.toMatch(/getCollectionByHandle/);
  });

  it('[server] bootstrap uses cached taxonomy only', () => {
    const source = read('src/infrastructure/server/catalog/loadCatalogBootstrap.ts');
    expect(source).toMatch(/getCachedCatalogCategories/);
    expect(source).not.toMatch(/getAllCategories/);
  });

  it('[constants] client and server page size stay aligned', () => {
    expect(CATALOG_PAGE_SIZE).toBe(CATALOG_SERVER_PAGE_SIZE);
  });

  it('[lcp] preload targets first visible product only', () => {
    expect(CATALOG_LCP_PRELOAD_COUNT).toBe(1);
  });

  it('[skeleton] initial skeleton count is centralized', () => {
    const skeletonSource = read('src/ui/pages/catalog/CatalogPageSkeleton.tsx');
    const resultsSource = read('src/ui/pages/catalog/components/CatalogResults.tsx');
    expect(skeletonSource).toMatch(/CATALOG_INITIAL_SKELETON_COUNT/);
    expect(resultsSource).toMatch(/CATALOG_INITIAL_SKELETON_COUNT/);
    expect(skeletonSource).not.toMatch(/length:\s*9/);
    expect(resultsSource).not.toMatch(/length:\s*9/);
  });

  it('[compat] ProductsPage legacy alias removed', () => {
    const indexSource = read('src/ui/pages/catalog/index.ts');
    expect(indexSource).not.toMatch(/ProductsPage/);
    expect(fs.existsSync(path.join(process.cwd(), 'src/ui/pages/ProductsPage.tsx'))).toBe(false);
  });
});
