import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_CART_QUANTITY } from '@domain/rules';
import { formatCartIssue } from '@ui/cart/formatCartIssues';

const CART_API_ROOT = path.join(process.cwd(), 'src/app/api/cart');

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

describe('Cart production proof', () => {
  it('[merge] guest cart merges through dedicated merge-guest route', () => {
    const route = read('src/app/api/cart/merge-guest/route.ts');
    const hook = read('src/ui/hooks/useCart.tsx');
    expect(route).toMatch(/mergeGuestItems/);
    expect(hook).toMatch(/mergeGuestItems/);
    expect(hook).toMatch(/remainingGuestItems/);
    expect(hook).toMatch(/saveGuestCart\(null\)/);
  });

  it('[refresh] stale cart refresh surfaces actionable issues', () => {
    const hook = read('src/ui/hooks/useCart.tsx');
    const page = read('src/ui/pages/CartPage.tsx');
    expect(hook).toMatch(/refreshCart/);
    expect(hook).toMatch(/validateCart/);
    expect(page).toMatch(/CartIssuesBanner/);
    expect(formatCartIssue({ code: 'pricing_changed', message: 'Price changed for Poster.' })).toMatch(
      /Refresh your cart/,
    );
  });

  it('[checkout] checkout blocks invalid cart with clear reasons', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    expect(checkout).toMatch(/cartIntent\.validateCart/);
    expect(checkout).toMatch(/issues\.map\(\(issue\) => issue\.message\)/);
  });

  it('[discount] validateCart clears removed/expired discount codes', () => {
    const flow = read('src/core/cart/cartFlowService.ts');
    expect(flow).toMatch(/discount_invalid/);
    expect(flow).toMatch(/discount_expired/);
    expect(flow).toMatch(/clearDiscountCode/);
    expect(flow).toMatch(/cart\.discount_cleared/);
  });

  it('[quantity] quantity limits enforced consistently at 99', () => {
    expect(MAX_CART_QUANTITY).toBe(99);
    const mergeRoute = read('src/app/api/cart/merge-guest/route.ts');
    const itemsRoute = read('src/app/api/cart/items/route.ts');
    const guestMutations = read('src/core/cart/cartMutations.ts');
    const validation = read('src/core/cart/cartValidationService.ts');
    expect(mergeRoute).toMatch(/quantity > 99/);
    expect(itemsRoute).toMatch(/quantity > 99/);
    expect(guestMutations).toMatch(/MAX_CART_QUANTITY/);
    expect(validation).toMatch(/MAX_CART_QUANTITY/);
  });

  it('[timeline] cart UX events never enter financial timeline', () => {
    const cartEvents = read('src/core/cart/cartEvents.ts');
    const cartFlow = read('src/core/cart/cartFlowService.ts');
    const commerceMappers = read('src/core/commerce/commerceEventMappers.ts');
    const timeline = read('src/core/commerce/commerceTimelineService.ts');

    expect(cartEvents).not.toMatch(/commerceEventBus/);
    expect(cartFlow).not.toMatch(/commerceEventBus/);
    expect(cartFlow).not.toMatch(/commerceTimeline/);
    expect(commerceMappers).not.toMatch(/cart\.item_added/);
    expect(commerceMappers).not.toMatch(/cart\.discount_applied/);
    expect(timeline).not.toMatch(/cart\./);

    for (const { file, source } of collectTsSources(CART_API_ROOT)) {
      expect(source, file).not.toMatch(/commerceEventBus/);
      expect(source, file).not.toMatch(/commerceTimeline/);
    }
  });
});
