import { expect, test } from '@playwright/test';
import {
  advanceCheckoutToPayment,
  placeCheckout,
  setupCheckoutSmokeMocks,
} from './helpers/checkoutSmoke';

test.describe('Checkout Flow (Mocked)', () => {
  test('completes the centralized checkout session protocol', async ({ page }) => {
    await setupCheckoutSmokeMocks(page, { orderId: 'ord-mock-789' });
    await page.goto('/checkout');

    await advanceCheckoutToPayment(page);
    await placeCheckout(page);

    await expect(page.getByText(/Thank you/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Order confirmed/i)).toBeVisible();
    await expect(page.getByText(/ORD-MOCK-789/i)).toBeVisible();
    await expect(page.getByText(/checkout-smoke@example.com/i)).toBeVisible();
  });
});
