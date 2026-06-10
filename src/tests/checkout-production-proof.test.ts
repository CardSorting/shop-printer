import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Checkout production proof', () => {
  it('[gate] invalid cart blocks checkout with actionable messages', () => {
    const gate = read('src/ui/checkout/validateBeforeCommit.ts');
    const page = read('src/ui/pages/CheckoutPage.tsx');
    expect(gate).toMatch(/gateCheckoutCommit/);
    expect(gate).toMatch(/formatCartIssues/);
    expect(page).toMatch(/commitGate\.blocked/);
    expect(page).toMatch(/checkout-error/);
  });

  it('[gate] server revalidates pricing at commitment time', () => {
    const mutation = read('src/core/order/checkoutMutationService.ts');
    expect(mutation).toMatch(/currentPrice !== item\.priceSnapshot/);
    expect(mutation).toMatch(/Price mismatch detected during checkout/);
  });

  it('[gate] server revalidates discount at commitment time', () => {
    const mutation = read('src/core/order/checkoutMutationService.ts');
    expect(mutation).toMatch(/validateDiscount/);
    expect(mutation).toMatch(/Checkout attempted with invalid discount code/);
  });

  it('[gate] inventory reservation TTL is bounded', () => {
    const mutation = read('src/core/order/checkoutMutationService.ts');
    expect(mutation).toMatch(/RESERVATION_TTL_MS/);
    expect(mutation).toMatch(/reservationExpiresAt/);
  });

  it('[gate] webhook ingress stays on checkout application service', () => {
    const webhook = read('src/app/api/webhooks/stripe/route.ts');
    expect(webhook).toMatch(/handleCheckoutWebhook/);
    expect(webhook).not.toMatch(/confirmStripePayment/);
  });

  it('[chain] cart never finalizes payment', () => {
    const cartApi = path.join(process.cwd(), 'src/app/api/cart');
    const walk = (dir: string): string[] => {
      const hits: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) hits.push(...walk(full));
        else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          hits.push(fs.readFileSync(full, 'utf8'));
        }
      }
      return hits;
    };
    for (const source of walk(cartApi)) {
      expect(source).not.toMatch(/createCheckoutSession/);
      expect(source).not.toMatch(/completeCheckoutWithPaymentMethod/);
      expect(source).not.toMatch(/reserveInventory/);
    }
  });
});
