import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CART_ROUTES = [
  'src/app/api/cart/route.ts',
  'src/app/api/cart/items/route.ts',
  'src/app/api/cart/note/route.ts',
  'src/app/api/cart/validate/route.ts',
  'src/app/api/cart/discount/route.ts',
  'src/app/api/cart/preview-line/route.ts',
];

const CART_ROUTE_ROOT = path.join(process.cwd(), 'src/app/api/cart');
const CART_UI_ROOT = path.join(process.cwd(), 'src/ui/cart');

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

describe('Cart protocol guard (purchase intent boundary)', () => {
  it('[routes] cart routes use services.cart only', () => {
    for (const route of CART_ROUTES) {
      const source = read(route);
      expect(source, route).toMatch(/services\.cart\./);
      expect(source, route).not.toMatch(/services\.cartService/);
      expect(source, route).not.toMatch(/reserveInventory/);
    }
  });

  it('[routes] cart routes do not finalize payment', () => {
    for (const { file, source } of collectTsSources(CART_ROUTE_ROOT)) {
      expect(source, file).not.toMatch(/createCheckoutSession/);
      expect(source, file).not.toMatch(/paymentIntent/);
      expect(source, file).not.toMatch(/Stripe/);
    }
  });

  it('[core] cart flow never reserves inventory', () => {
    const flow = read('src/core/cart/cartFlowService.ts');
    const store = read('src/core/cart/cartStore.ts');
    expect(flow).not.toMatch(/reserveInventory/);
    expect(store).not.toMatch(/reserveInventory/);
  });

  it('[core] checkout revalidates cart before payment', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    expect(checkout).toMatch(/validateCart/);
    expect(checkout).toMatch(/cartIntent/);
  });

  it('[client] deprecated cartService shim removed from api client', () => {
    const source = read('src/ui/apiClientServices.ts');
    expect(source).not.toMatch(/cartService:\s*\{/);
  });

  it('[ui] useCart does not fetch products for snapshots', () => {
    const source = read('src/ui/hooks/useCart.tsx');
    expect(source).not.toMatch(/productService/);
    expect(source).toMatch(/services\.cart/);
    expect(source).toMatch(/previewLineItem/);
  });

  it('[ui] useCart does not optimistically invent line snapshots for authed users', () => {
    const source = read('src/ui/hooks/useCart.tsx');
    expect(source).toMatch(/syncFromView/);
    expect(source).not.toMatch(/priceSnapshot:\s*price/);
  });

  it('[ui] cart view state machine is canonical', () => {
    const types = read('src/ui/cart/types.ts');
    expect(types).toMatch(/loading/);
    expect(types).toMatch(/empty/);
    expect(types).toMatch(/ready/);
    expect(types).toMatch(/expired/);
    expect(types).toMatch(/invalid/);
    const hook = read('src/ui/hooks/useCart.tsx');
    expect(hook).toMatch(/deriveCartViewState/);
  });

  it('[core] line items use snapshots', () => {
    const pricing = read('src/core/cart/pricingSnapshotService.ts');
    expect(pricing).toMatch(/priceSnapshot/);
    expect(pricing).toMatch(/buildLineSnapshot/);
  });

  it('[core] cart events are UX scoped only', () => {
    const events = read('src/core/cart/cartEvents.ts');
    expect(events).toMatch(/cart\.item_added/);
    expect(events).not.toMatch(/commerceEventBus/);
    expect(events).not.toMatch(/payment/);
  });

  it('[validation] stale pricing and unavailable products become issues', () => {
    const validation = read('src/core/cart/cartValidationService.ts');
    expect(validation).toMatch(/pricing_changed/);
    expect(validation).toMatch(/product_unavailable/);
    expect(validation).toMatch(/discount_expired/);
  });
});
