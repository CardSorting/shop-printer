import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CHECKOUT_ROUTES = [
  'src/app/api/checkout/create-payment-intent/route.ts',
  'src/app/api/checkout/verify/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/webhooks/stripe/route.ts',
];

const CHECKOUT_ROUTE_ROOT = path.join(process.cwd(), 'src/app/api/checkout');

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

describe('Checkout protocol guard (commitment gate boundary)', () => {
  it('[routes] checkout routes delegate only to services.checkout', () => {
    for (const route of CHECKOUT_ROUTES) {
      const source = read(route);
      expect(source, route).toMatch(/services\.checkout\./);
      expect(source, route).not.toMatch(/services\.cartService/);
      expect(source, route).not.toMatch(/services\.cart\.addItem/);
      expect(source, route).not.toMatch(/runCheckoutReservation\s*\(/);
    }
  });

  it('[routes] place-order route does not bypass checkout application service', () => {
    const source = read('src/app/api/orders/route.ts');
    expect(source).toMatch(/completeCheckoutWithPaymentMethod/);
    expect(source).toMatch(/checkoutRouteResponse/);
    expect(source).not.toMatch(/orderService\.create/);
  });

  it('[routes] payment intent route requires idempotency key', () => {
    const source = read('src/app/api/checkout/create-payment-intent/route.ts');
    expect(source).toMatch(/requireIdempotencyKey/);
    expect(source).toMatch(/createCheckoutSession/);
  });

  it('[core] checkout validates cart before reservation', () => {
    const source = read('src/core/order/checkoutMutationService.ts');
    expect(source).toMatch(/cartIntent\.validateCart/);
    expect(source).toMatch(/ACQUIRE_RESERVATION/);
  });

  it('[core] inventory reservation happens in checkout mutation only', () => {
    const cartFlow = read('src/core/cart/cartFlowService.ts');
    const checkout = read('src/core/order/checkoutMutationService.ts');
    expect(cartFlow).not.toMatch(/reserveInventory/);
    expect(checkout).toMatch(/reserveInventory/);
  });

  it('[ui] checkout page gates commit on cart validation', () => {
    const page = read('src/ui/pages/CheckoutPage.tsx');
    expect(page).toMatch(/gateCheckoutCommit/);
    expect(page).toMatch(/services\.cart\.validateCart/);
    expect(page).not.toMatch(/productService/);
  });

  it('[ui] checkout module does not capture payment directly', () => {
    for (const { file, source } of collectTsSources(path.join(process.cwd(), 'src/ui/checkout'))) {
      expect(source, file).not.toMatch(/reserveInventory/);
      expect(source, file).not.toMatch(/cartService/);
    }
  });
});
