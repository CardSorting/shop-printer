import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const STOREFRONT_CHAIN = [
  {
    lane: 'catalog',
    route: 'src/app/collections/[slug]/page.tsx',
    server: '@infrastructure/server/catalog',
    ui: '@ui/pages/catalog',
  },
  {
    lane: 'product-detail',
    route: 'src/app/products/[handle]/page.tsx',
    server: '@infrastructure/server/product-detail',
    ui: '@ui/pages/product-detail',
  },
  {
    lane: 'cart',
    routes: [
      'src/app/api/cart/route.ts',
      'src/app/api/cart/items/route.ts',
      'src/app/api/cart/merge-guest/route.ts',
    ],
    server: 'services.cart',
    ui: '@ui/cart',
  },
  {
    lane: 'checkout',
    route: 'src/app/api/checkout/create-payment-intent/route.ts',
    server: 'services.checkout',
    gate: 'cartIntent.validateCart',
  },
  {
    lane: 'inventory',
    reserve: 'src/core/order/checkoutMutationService.ts',
    server: 'services.inventory',
    cleanup: 'src/app/api/system/cleanup-inventory/route.ts',
  },
  {
    lane: 'payment',
    routes: [
      'src/app/api/checkout/create-payment-intent/route.ts',
      'src/app/api/orders/route.ts',
      'src/app/api/webhooks/stripe/route.ts',
    ],
    server: 'services.checkout',
  },
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Storefront release guard (frozen chain)', () => {
  it('[catalog] route uses catalog protocol only', () => {
    const source = read('src/app/collections/[slug]/page.tsx');
    expect(source).toMatch(/@infrastructure\/server\/catalog/);
    expect(source).toMatch(/@ui\/pages\/catalog/);
    expect(source).not.toMatch(/ProductsPage/);
  });

  it('[pdp] route uses product-detail protocol only', () => {
    const source = read('src/app/products/[handle]/page.tsx');
    expect(source).toMatch(/@infrastructure\/server\/product-detail/);
    expect(source).toMatch(/@ui\/pages\/product-detail/);
    expect(source).not.toMatch(/initialProduct/);
  });

  it('[cart] API routes use cart application service only', () => {
    for (const route of [
      'src/app/api/cart/route.ts',
      'src/app/api/cart/items/route.ts',
      'src/app/api/cart/merge-guest/route.ts',
      'src/app/api/cart/validate/route.ts',
    ]) {
      const source = read(route);
      expect(source, route).toMatch(/services\.cart/);
      expect(source, route).not.toMatch(/services\.cartService/);
    }
  });

  it('[cart] client uses cart protocol, not deprecated cartService shim', () => {
    const hook = read('src/ui/hooks/useCart.tsx');
    const apiClient = read('src/ui/apiClientServices.ts');
    expect(hook).toMatch(/services\.cart/);
    expect(apiClient).toMatch(/cart:\s*\{/);
    expect(apiClient).not.toMatch(/cartService:\s*\{/);
  });

  it('[checkout] commitment gate validates cart before reservation', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    const route = read('src/app/api/checkout/create-payment-intent/route.ts');
    const page = read('src/ui/pages/CheckoutPage.tsx');
    expect(checkout).toMatch(/cartIntent\.validateCart/);
    expect(route).toMatch(/services\.checkout/);
    expect(route).not.toMatch(/cartService/);
    expect(page).toMatch(/gateCheckoutCommit/);
  });

  it('[legacy] concierge reads cart through application service', () => {
    const source = read('src/app/api/concierge/chat/route.ts');
    expect(source).toMatch(/cart\.getCart/);
    expect(source).not.toMatch(/cartService\.getCart/);
  });

  it('[e2e] cart protocol helper exists for release smoke mocks', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'e2e/helpers/cartProtocol.ts'))).toBe(true);
    const helper = read('e2e/helpers/cartProtocol.ts');
    expect(helper).toMatch(/cartOk/);
    expect(helper).toMatch(/WoodBine_guest_cart/);
  });

  it('[inventory] checkout reserves stock; cart only checks availability', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    const cartService = read('src/core/CartService.ts');
    const cleanup = read('src/app/api/system/cleanup-inventory/route.ts');
    expect(checkout).toMatch(/reserveInventory/);
    expect(checkout).toMatch(/confirmReservation/);
    expect(checkout).toMatch(/releaseReservation/);
    expect(cartService).toMatch(/checkAvailability/);
    expect(cartService).not.toMatch(/reserveInventory/);
    expect(cleanup).toMatch(/services\.inventory\.cleanupExpiredReservations/);
  });

  it('[payment] money capture routes delegate to services.checkout', () => {
    for (const route of [
      'src/app/api/checkout/create-payment-intent/route.ts',
      'src/app/api/orders/route.ts',
      'src/app/api/webhooks/stripe/route.ts',
    ]) {
      const source = read(route);
      expect(source, route).toMatch(/services\.checkout/);
      expect(source, route).not.toMatch(/confirmStripePayment/);
    }
    const stripeForm = read('src/ui/checkout/StripeCheckoutForm.tsx');
    expect(stripeForm).toMatch(/createPaymentMethod/);
    expect(stripeForm).not.toMatch(/confirmCardPayment/);
  });
});
