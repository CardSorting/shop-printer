import type { Page, Route } from '@playwright/test';
import {
  buildCartView,
  cartOk,
  guestCartPayload,
  GUEST_CART_STORAGE_KEY,
  type MockCartLine,
} from './cartProtocol';

export const SMOKE_USER = {
  id: 'e2e-checkout-user',
  email: 'checkout-smoke@example.com',
  displayName: 'Checkout Smoke',
  role: 'customer',
};

const DEFAULT_ITEM: MockCartLine = {
  productId: 'p-smoke-1',
  name: 'Smoke Test Print',
  priceSnapshot: 5000,
  quantity: 1,
  imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
};

export async function seedGuestCart(page: Page, items: MockCartLine[] = [DEFAULT_ITEM]) {
  await page.addInitScript(
    ({ key, cart }) => {
      const marker = `${key}:e2e-seeded`;
      if (sessionStorage.getItem(marker)) return;
      localStorage.setItem(key, JSON.stringify(cart));
      sessionStorage.setItem(marker, '1');
    },
    { key: GUEST_CART_STORAGE_KEY, cart: guestCartPayload(items) },
  );
}

function isCartApi(url: string): boolean {
  const path = new URL(url).pathname;
  return path === '/api/cart' || path.startsWith('/api/cart/');
}

export async function setupCheckoutSmokeMocks(
  page: Page,
  options: {
    authed?: boolean;
    cartValid?: boolean;
    orderStatus?: number;
    orderError?: string;
    orderId?: string;
  } = {},
) {
  const {
    authed = true,
    cartValid = true,
    orderStatus = 200,
    orderError,
    orderId = 'ord-smoke-001',
  } = options;

  await page.route('/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authed ? SMOKE_USER : null),
    });
  });

  const shippingRates = [
    {
      id: 'r-smoke',
      name: 'Standard Shipping',
      amount: 599,
      type: 'price_based',
      minLimit: 0,
      maxLimit: 99999,
      shippingZoneId: 'z-smoke',
    },
  ];
  const shippingZones = [{ id: 'z-smoke', name: 'USA', countries: ['US'] }];

  for (const path of ['/api/shipping/rates', '/api/admin/shipping/rates']) {
    await page.route(path, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shippingRates),
      });
    });
  }

  for (const path of ['/api/shipping/zones', '/api/admin/shipping/zones']) {
    await page.route(path, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shippingZones),
      });
    });
  }

  await page.route('/api/products*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ products: [], nextCursor: null }),
    });
  });

  await page.route((url) => isCartApi(url.toString()), async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/validate') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          cartOk(
            cartValid
              ? { valid: true, issues: [], requiresRefresh: false }
              : {
                  valid: false,
                  issues: [{ code: 'pricing_changed', productId: DEFAULT_ITEM.productId, message: 'Price changed' }],
                  requiresRefresh: true,
                },
          ),
        ),
      });
      return;
    }

    const view = buildCartView([DEFAULT_ITEM], authed ? SMOKE_USER.id : 'guest');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cartOk(view)),
    });
  });

  let checkoutAddress: Record<string, string> | undefined;
  await page.route('/api/checkout/create-payment-intent', async (route: Route) => {
    if (orderStatus >= 400) {
      await route.fulfill({
        status: orderStatus,
        contentType: 'application/json',
        body: JSON.stringify({ error: orderError ?? 'Payment failed.' }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as { shippingAddress?: Record<string, string> };
    checkoutAddress = payload.shippingAddress;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clientSecret: 'pi_smoke_secret_smoke',
        paymentIntentId: 'pi_smoke',
        orderId,
        amount: 5599,
        paymentStatus: 'requires_payment_method',
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      }),
    });
  });

  await page.route('/api/checkout/verify', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, orderId, status: 'processing' }),
    });
  });

  await page.route(`**/api/orders/${orderId}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: orderId,
        userId: SMOKE_USER.id,
        status: 'confirmed',
        paymentState: 'paid',
        total: 5599,
        shippingAmount: 599,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            productId: DEFAULT_ITEM.productId,
            name: DEFAULT_ITEM.name,
            unitPrice: DEFAULT_ITEM.priceSnapshot,
            quantity: 1,
            imageUrl: DEFAULT_ITEM.imageUrl,
          },
        ],
        shippingAddress: checkoutAddress,
        customerEmail: SMOKE_USER.email,
        customerName: SMOKE_USER.displayName,
      }),
    });
  });
}

export async function advanceCheckoutToPayment(page: Page) {
  await expectCheckoutLoaded(page);
  await page.locator('#checkout-street').fill('123 Smoke Lane');
  await page.locator('#checkout-city').fill('Portland');
  await page.locator('#checkout-state').fill('OR');
  await page.locator('#checkout-zip').fill('97201');
  await page.locator('[data-testid="continue-to-shipping"]').click();
  await page.locator('[data-testid="continue-to-payment"]').click();
  await page.locator('[data-testid="payment-header"]').waitFor({ state: 'visible', timeout: 15000 });
}

async function expectCheckoutLoaded(page: Page) {
  await page.locator('[data-testid="checkout-title"]').waitFor({ state: 'visible', timeout: 15000 });
}

export async function placeCheckout(page: Page) {
  const mockButton = page.locator('[data-testid="mock-checkout-button"]');
  const offlineButton = page.locator('[data-testid="offline-checkout-button"]');

  try {
    await mockButton.waitFor({ state: 'visible', timeout: 20_000 });
    await mockButton.click();
    return;
  } catch {
    await offlineButton.waitFor({ state: 'visible', timeout: 5000 });
    await offlineButton.click();
  }
}
