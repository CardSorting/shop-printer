import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCT_DETAIL_LCP_PRELOAD_COUNT } from '@infrastructure/server/product-detail/constants';

const PRODUCT_DETAIL_ROUTES = [
  'src/app/products/[handle]/page.tsx',
  'src/app/collections/[slug]/products/[handle]/page.tsx',
];

const PRODUCT_DETAIL_ROUTE_ROOTS = [
  path.join(process.cwd(), 'src/app/products'),
  path.join(process.cwd(), 'src/app/collections'),
];

const PRODUCT_DETAIL_UI_ROOT = path.join(process.cwd(), 'src/ui/pages/product-detail');

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

describe('Product detail protocol guard (storefront item read boundary)', () => {
  it('[routes] product detail routes import only @infrastructure/server/product-detail', () => {
    for (const route of PRODUCT_DETAIL_ROUTES) {
      const source = read(route);
      expect(source, route).toMatch(/@infrastructure\/server\/product-detail/);
      expect(source, route).not.toMatch(/getServerServices/);
      expect(source, route).not.toMatch(/productService/);
      expect(source, route).not.toMatch(/productToSeoContext/);
      expect(source, route).not.toMatch(/productImages\s*\(/);
    }
  });

  it('[routes] product detail routes import UI only from @ui/pages/product-detail', () => {
    const mainRoute = read('src/app/products/[handle]/page.tsx');
    expect(mainRoute).toMatch(/@ui\/pages\/product-detail/);
    expect(mainRoute).not.toMatch(/initialProduct/);
  });

  it('[routes] main PDP route uses prepareProductDetailPage', () => {
    const source = read('src/app/products/[handle]/page.tsx');
    expect(source).toMatch(/prepareProductDetailPage/);
    expect(source).not.toMatch(/async function getProduct/);
    expect(source).not.toMatch(/JSON\.parse\(JSON\.stringify/);
  });

  it('[routes] nested collection product route uses resolveProductSlug only', () => {
    const source = read('src/app/collections/[slug]/products/[handle]/page.tsx');
    expect(source).toMatch(/resolveProductSlug/);
    expect(source).not.toMatch(/async function getProduct/);
    expect(source).not.toMatch(/prepareProductDetailPage/);
  });

  it('[routes] no route duplicates slug/SEO/bootstrap assembly', () => {
    for (const root of PRODUCT_DETAIL_ROUTE_ROOTS) {
      for (const { file, source } of collectTsSources(root)) {
        if (!file.includes('/products/')) continue;
        expect(source, file).not.toMatch(/serializeProductDetailBootstrap/);
        expect(source, file).not.toMatch(/loadProductDetailBootstrap\s*\(/);
        expect(source, file).not.toMatch(/selectRelatedProducts\s*\(/);
      }
    }
  });

  it('[ui] product detail hook does not fetch product or related products', () => {
    const source = read('src/ui/pages/product-detail/hooks/useProductDetail.ts');
    expect(source).not.toMatch(/productService/);
    expect(source).not.toMatch(/getProductByHandle/);
    expect(source).not.toMatch(/getProducts\s*\(/);
    expect(source).toMatch(/addItem/);
  });

  it('[ui] components do not define local cache/LCP constants', () => {
    const forbidden = [/CACHE_TTL/, /rel="preload"/, /PRODUCT_DETAIL_LCP/];
    for (const { file, source } of collectTsSources(PRODUCT_DETAIL_UI_ROOT)) {
      if (
        file.endsWith('constants.ts') ||
        file.endsWith('ProductLcpPreload.tsx') ||
        file.endsWith('index.ts')
      ) {
        continue;
      }
      for (const pattern of forbidden) {
        expect(source, `${file} must not define ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('[ui] related products come from bootstrap props only', () => {
    const pageSource = read('src/ui/pages/product-detail/ProductDetailPage.tsx');
    const hookSource = read('src/ui/pages/product-detail/hooks/useProductDetail.ts');
    expect(pageSource).toMatch(/relatedProducts/);
    expect(hookSource).not.toMatch(/setRelatedProducts/);
    expect(hookSource).not.toMatch(/loadingRelated/);
  });

  it('[lcp] preload targets primary product image only', () => {
    expect(PRODUCT_DETAIL_LCP_PRELOAD_COUNT).toBe(1);
    const routeSource = read('src/app/products/[handle]/page.tsx');
    expect(routeSource).toMatch(/ProductLcpPreload/);
    expect(routeSource).toMatch(/prepared\.lcpImageUrls/);
  });

  it('[skeleton] loading skeleton is centralized', () => {
    const pageSource = read('src/ui/pages/product-detail/ProductDetailPage.tsx');
    expect(pageSource).toMatch(/ProductDetailSkeleton/);
    expect(pageSource).not.toMatch(/animate-pulse/);
  });

  it('[viewState] canonical unavailable reasons are archived and out_of_stock', () => {
    const typesSource = read('src/ui/pages/product-detail/types.ts');
    expect(typesSource).toMatch(/archived/);
    expect(typesSource).toMatch(/out_of_stock/);
    const pageSource = read('src/ui/pages/product-detail/ProductDetailPage.tsx');
    expect(pageSource).toMatch(/ProductUnavailable/);
  });
});
