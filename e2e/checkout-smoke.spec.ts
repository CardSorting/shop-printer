import { test, expect } from '@playwright/test';
import {
  advanceCheckoutToPayment,
  placeCheckout,
  setupCheckoutSmokeMocks,
  SMOKE_USER,
} from './helpers/checkoutSmoke';

test.describe('Checkout smoke (storefront release)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
  });

  test('completes checkout and shows order confirmation', async ({ page }) => {
    await setupCheckoutSmokeMocks(page);
    await page.goto('/checkout');

    await advanceCheckoutToPayment(page);
    await placeCheckout(page);

    await expect(page.getByText(/Thank you/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/ORD-SMOKE-00/i)).toBeVisible();
    await expect(page.getByText(SMOKE_USER.email)).toBeVisible();
  });

  test('blocks payment when cart validation fails', async ({ page }) => {
    await setupCheckoutSmokeMocks(page, { cartValid: false });
    await page.goto('/checkout');

    await advanceCheckoutToPayment(page);
    await placeCheckout(page);

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#checkout-error')).toContainText(/updated prices|attention|cart/i);
  });

  test('surfaces payment errors from checkout session creation', async ({ page }) => {
    await setupCheckoutSmokeMocks(page, {
      orderStatus: 402,
      orderError: 'Insufficient funds.',
    });
    await page.goto('/checkout');

    await advanceCheckoutToPayment(page);
    await placeCheckout(page);

    await expect(page.locator('#checkout-error')).toContainText(/Insufficient funds/i, { timeout: 20000 });
  });

  test('does not expose the retired order-placement endpoint', async ({ page }) => {
    await setupCheckoutSmokeMocks(page);
    await page.goto('/checkout');

    const status = await page.evaluate(async () => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retiredProtocolProbe: true }),
      });
      return response.status;
    });

    expect(status).toBe(405);
  });
});
