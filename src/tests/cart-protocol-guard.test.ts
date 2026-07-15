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
  'src/app/api/cart/merge-guest/route.ts',
];

const CART_ROUTE_ROOT = path.join(process.cwd(), 'src/app/api/cart');
const CART_UI_ROOT = path.join(process.cwd(), 'src/ui/cart');
const ROUTE_ROOT = path.join(process.cwd(), 'src/app/api');

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

  it('[routes] no route reads or mutates the cart repository directly', () => {
    for (const { file, source } of collectTsSources(ROUTE_ROOT)) {
      expect(source, file).not.toMatch(/\bcartRepo\.(?:getByUserId|save|clear)\(/);
    }
  });

  it('[routes] every authenticated cart mutation enforces trusted origin', () => {
    for (const route of [
      'src/app/api/cart/route.ts',
      'src/app/api/cart/items/route.ts',
      'src/app/api/cart/note/route.ts',
      'src/app/api/cart/validate/route.ts',
      'src/app/api/cart/discount/route.ts',
      'src/app/api/cart/merge-guest/route.ts',
    ]) {
      expect(read(route), route).toMatch(/assertTrustedMutationOrigin\(request\)/);
    }
  });

  it('[core] cart flow never reserves inventory', () => {
    const flow = read('src/core/cart/cartFlowService.ts');
    const availability = read('src/core/cart/inventoryAvailabilityReader.ts');
    expect(flow).not.toMatch(/reserveInventory/);
    expect(availability).toMatch(/checkAvailability/);
    expect(availability).not.toMatch(/reserveInventory/);
  });

  it('[migration] legacy cart implementations and container aliases stay deleted', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/core/CartService.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'src/core/cart/cartStore.ts'))).toBe(false);
    const application = read('src/core/cart/cartApplicationService.ts');
    const stack = read('src/core/cart/createCartStack.ts');
    const container = read('src/core/container.ts');
    expect(application).not.toMatch(/CartApplicationServiceImpl/);
    expect(stack).not.toMatch(/CartService|CartStore|cartService|\bflow:/);
    expect(container).not.toMatch(/cartService/);
    expect(container).not.toMatch(/\n {4}cartRepo: cartRepoInstance!,/);
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

  it('[ui] cart mutations execute through one owner-scoped queue', () => {
    const source = read('src/ui/hooks/useCart.tsx');
    expect(source).toMatch(/mutationTailRef/);
    expect(source).toMatch(/enqueueCartMutation/);
    expect(source).toMatch(/Cart owner changed/);
  });

  it('[storage] guest cart accepts only the current versioned protocol', () => {
    const storage = read('src/ui/cart/guestCartStorage.ts');
    expect(storage).toMatch(/GUEST_CART_STORAGE_VERSION = 1/);
    expect(storage).toMatch(/cart:guest:v1/);
    expect(storage).not.toMatch(/WoodBine_guest_cart|woodbine_guest_cart|LEGACY_GUEST_CART/);
  });

  it('[browser] cart smoke uses the isolated modern checkout harness', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const config = read('playwright.checkout-smoke.config.ts');
    const runner = read('scripts/run-checkout-smoke.sh');
    expect(packageJson.scripts['test:e2e:cart-smoke']).toMatch(/run-checkout-smoke\.sh cart-checkout-comprehensive\.spec\.ts/);
    expect(config).toMatch(/cart-checkout-comprehensive\.spec\.ts/);
    expect(runner).toMatch(/NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1/);
    expect(runner).not.toMatch(/exec npx playwright/);
  });

  it('[docs] canonical cart guidance describes only the current execution path', () => {
    const cartDoc = read('docs/cart.md');
    const activeGuides = [
      'README.md',
      'docs/api-overview.md',
      'docs/architecture.md',
      'docs/cart.md',
      'docs/storefront.md',
      'docs/storefront-release.md',
      'docs/testing.md',
      '.wiki/architecture/project-state.md',
      '.wiki/architecture/order-flow-throughput.md',
      '.wiki/onboarding/walkthrough.md',
    ].map(read).join('\n');

    expect(cartDoc).toMatch(/CartApplicationService/);
    expect(cartDoc).toMatch(/CartFlowService/);
    expect(cartDoc).toMatch(/cart:guest:v1/);
    expect(cartDoc).toMatch(/npm run test:e2e:cart-smoke/);
    expect(activeGuides).not.toMatch(
      /CartService|CartStore|CartApplicationServiceImpl|TrustedCheckoutGateway|StripePaymentProcessor|completeWithPaymentMethod/,
    );
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

  it('[identity] update and remove preserve customization identity end to end', () => {
    const route = read('src/app/api/cart/items/route.ts');
    const flow = read('src/core/cart/cartFlowService.ts');
    const rules = read('src/domain/rules.ts');
    const page = read('src/ui/pages/CartPage.tsx');
    const drawer = read('src/ui/components/CartDrawer.tsx');
    expect(route).toMatch(/customImages/);
    expect(flow).toMatch(/cartLineMatches/);
    expect(rules).toMatch(/export function cartLineMatches/);
    expect(page).toMatch(/item\.customImages/);
    expect(drawer).toMatch(/item\.customImages/);
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
