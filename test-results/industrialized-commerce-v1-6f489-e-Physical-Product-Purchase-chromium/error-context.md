# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: industrialized-commerce-v10.spec.ts >> Industrialized Commerce Suite V10 >> Full Life Cycle: Physical Product Purchase
- Location: e2e/industrialized-commerce-v10.spec.ts:138:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="product-card"]').filter({ hasText: 'Physical Masterpiece' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('[data-testid="product-card"]').filter({ hasText: 'Physical Masterpiece' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Woodbine Food Hall" [ref=e5] [cursor=pointer]:
          - /url: /
          - img "Woodbine Food Hall" [ref=e6]
        - generic [ref=e7]:
          - link "Menu" [ref=e8] [cursor=pointer]:
            - /url: /collections/bestsellers
          - link "Visit" [ref=e9] [cursor=pointer]:
            - /url: /support
          - link "Community" [ref=e10] [cursor=pointer]:
            - /url: /blog
        - generic [ref=e11]:
          - generic:
            - img
          - textbox "Search vendors & dishes..." [ref=e12]
        - generic [ref=e13]:
          - button [ref=e15]:
            - img [ref=e16]
          - generic [ref=e21]:
            - link [ref=e22] [cursor=pointer]:
              - /url: /account
              - img [ref=e23]
            - generic:
              - generic:
                - generic:
                  - paragraph: Industrial Tester
                - link "Account":
                  - /url: /account
                - button "Sign Out"
          - button "Open cart" [ref=e26]:
            - img [ref=e27]
            - generic [ref=e31]: "0"
    - main [ref=e32]:
      - generic [ref=e35]:
        - heading "404" [level=1] [ref=e36]
        - heading "This page could not be found." [level=2] [ref=e38]
    - contentinfo [ref=e39]:
      - generic [ref=e41]:
        - region "WoodBine" [ref=e43]:
          - generic [ref=e44]:
            - link "Woodbine Food Hall" [ref=e45] [cursor=pointer]:
              - /url: /
              - img "Woodbine Food Hall" [ref=e46]
            - generic [ref=e47]:
              - link "545 West 700 South, Salt Lake City, UT 84101" [ref=e48] [cursor=pointer]:
                - /url: https://www.google.com/maps/search/?api=1&query=545%20West%20700%20South%2C%20Salt%20Lake%20City%2C%20UT%2084101
              - link "hello@woodbineslc.com" [ref=e49] [cursor=pointer]:
                - /url: mailto:hello@woodbineslc.com
          - navigation "Footer navigation" [ref=e51]:
            - generic [ref=e52]:
              - heading "Explore" [level=3] [ref=e53]
              - list [ref=e54]:
                - listitem [ref=e55]:
                  - link "Menu" [ref=e56] [cursor=pointer]:
                    - /url: /collections/bestsellers
                - listitem [ref=e57]:
                  - link "Stories" [ref=e58] [cursor=pointer]:
                    - /url: /blog
            - generic [ref=e59]:
              - heading "Visit" [level=3] [ref=e60]
              - list [ref=e61]:
                - listitem [ref=e62]:
                  - link "Hours & directions" [ref=e63] [cursor=pointer]:
                    - /url: /support
                - listitem [ref=e64]:
                  - link "Private events" [ref=e65] [cursor=pointer]:
                    - /url: /support?contact=true
            - generic [ref=e66]:
              - heading "Account" [level=3] [ref=e67]
              - list [ref=e68]:
                - listitem [ref=e69]:
                  - link "Sign in" [ref=e70] [cursor=pointer]:
                    - /url: /login
                - listitem [ref=e71]:
                  - link "Orders" [ref=e72] [cursor=pointer]:
                    - /url: /orders
                - listitem [ref=e73]:
                  - link "Help" [ref=e74] [cursor=pointer]:
                    - /url: /support
        - separator [ref=e75]
        - generic [ref=e77]:
          - region "Join the Neighborhood Table" [ref=e78]:
            - generic [ref=e80]:
              - complementary [ref=e81]:
                - generic [ref=e83]:
                  - generic [ref=e84]:
                    - generic [ref=e85]: "01"
                    - img [ref=e86]
                    - generic [ref=e87]:
                      - generic [ref=e88]: Salt City BBQ
                      - generic [ref=e89]: Smoke & fire
                  - generic [ref=e90]:
                    - generic [ref=e91]: "02"
                    - img [ref=e92]
                    - generic [ref=e93]:
                      - generic [ref=e94]: Deadpan Pizza
                      - generic [ref=e95]: Hall sandos
                  - generic [ref=e96]:
                    - generic [ref=e97]: "03"
                    - img [ref=e98]
                    - generic [ref=e99]:
                      - generic [ref=e100]: The room
                      - generic [ref=e101]: Communal tables
                - generic [ref=e102]:
                  - generic [ref=e103]: Warehouse District · SLC
                  - strong [ref=e104]: Nine kitchens
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - paragraph [ref=e108]: From the hall
                    - generic [ref=e109]: Weekly digest
                  - heading "Join the Neighborhood Table" [level=2] [ref=e110]:
                    - text: Join the
                    - emphasis [ref=e111]: Neighborhood Table
                  - paragraph [ref=e113]: Vendor spotlights, community nights, and the stories behind the room—so you never miss a reason to come back and pull up a chair.
                - list "What you will receive" [ref=e114]:
                  - listitem [ref=e115]:
                    - generic [ref=e116]: "01"
                    - img [ref=e118]
                    - generic [ref=e123]:
                      - strong [ref=e124]: Vendor spotlights
                      - generic [ref=e125]: New counters, signature plates, and who is on the line this week.
                  - listitem [ref=e126]:
                    - generic [ref=e127]: "02"
                    - img [ref=e129]
                    - generic [ref=e132]:
                      - strong [ref=e133]: Community nights
                      - generic [ref=e134]: Trivia, markets, and the gatherings that fill the warehouse room.
                  - listitem [ref=e135]:
                    - generic [ref=e136]: "03"
                    - img [ref=e138]
                    - generic [ref=e140]:
                      - strong [ref=e141]: Stories from the hall
                      - generic [ref=e142]: Regulars, recipes, and the people behind the barrel roof.
                - generic [ref=e143]:
                  - paragraph [ref=e144]: Your seat at the table
                  - generic [ref=e145]:
                    - generic [ref=e146]:
                      - generic [ref=e147]: Email address
                      - img
                      - textbox "Email address" [ref=e148]:
                        - /placeholder: you@example.com
                    - button "Subscribe" [ref=e149] [cursor=pointer]:
                      - text: Subscribe
                      - img [ref=e150]
                  - paragraph [ref=e152]: One email when it matters. Unsubscribe anytime—we'd rather see you at a communal table anyway.
            - generic [ref=e154]:
              - generic [ref=e155]: ◆Mozz
              - generic [ref=e156]: ◆DeadPan
              - generic [ref=e157]: ◆Salt City BBQ
              - generic [ref=e158]: ◆Dom's Burgers
              - generic [ref=e159]: ◆Tosh's Ramen
              - generic [ref=e160]: ◆Shwe Letyar
              - generic [ref=e161]: ◆Chunky
              - generic [ref=e162]: ◆Marcato
              - generic [ref=e163]: ◆Caracas Grill
              - generic [ref=e164]: ◆Mozz
              - generic [ref=e165]: ◆DeadPan
              - generic [ref=e166]: ◆Salt City BBQ
              - generic [ref=e167]: ◆Dom's Burgers
              - generic [ref=e168]: ◆Tosh's Ramen
              - generic [ref=e169]: ◆Shwe Letyar
              - generic [ref=e170]: ◆Chunky
              - generic [ref=e171]: ◆Marcato
              - generic [ref=e172]: ◆Caracas Grill
          - generic [ref=e173]:
            - generic [ref=e174]:
              - img [ref=e175]
              - generic [ref=e178]: US / USD
              - img [ref=e179]
            - generic "Accepted payment methods" [ref=e181]:
              - img [ref=e182]
              - generic [ref=e184]: Mastercard
              - generic [ref=e185]: PayPal
              - generic [ref=e186]: Stripe
              - generic [ref=e187]:
                - img [ref=e188]
                - text: Secure checkout
        - separator [ref=e191]
        - generic [ref=e192]:
          - paragraph [ref=e193]: © 2026 WoodBine. All Rights Reserved.
          - paragraph [ref=e194]: Nine kitchens · one roof · pull up a chair.
  - generic [ref=e199] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e200]:
      - img [ref=e201]
    - generic [ref=e204]:
      - button "Open issues overlay" [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e207]: "1"
          - generic [ref=e208]: "2"
        - generic [ref=e209]:
          - text: Issue
          - generic [ref=e210]: s
      - button "Collapse issues badge" [ref=e211]:
        - img [ref=e212]
  - alert [ref=e214]
```

# Test source

```ts
  41  |         priceSnapshot: product.price, quantity, imageUrl: product.imageUrl, isDigital: product.isDigital,
  42  |       };
  43  |     };
  44  | 
  45  |     await page.route('**/api/**', async (route) => {
  46  |       const url = route.request().url();
  47  |       const method = route.request().method();
  48  |       const body = route.request().postDataJSON() || {};
  49  |       const searchParams = new URL(url).searchParams;
  50  | 
  51  |       // 1. AUTH
  52  |       if (url.includes('/api/auth/me')) {
  53  |         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  54  |           id: 'u_v10', email: 'client@hive.art', displayName: 'Industrial Tester', role: 'customer', createdAt: nowIso
  55  |         }) });
  56  |       }
  57  | 
  58  |       // 2. PRODUCTS
  59  |       if (url.includes('/api/products')) {
  60  |         if (url.includes('/api/products/')) {
  61  |           const idOrHandle = url.split('/').pop()?.split('?')[0];
  62  |           const product = allProducts.find(p => p.id === idOrHandle || p.handle === idOrHandle);
  63  |           return product ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(product) }) : route.fulfill({ status: 404 });
  64  |         }
  65  |         const query = searchParams.get('query')?.toLowerCase();
  66  |         let products = allProducts;
  67  |         if (query) {
  68  |           products = allProducts.filter(p => p.name.toLowerCase().includes(query) || p.handle.toLowerCase().includes(query));
  69  |         }
  70  |         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products }) });
  71  |       }
  72  | 
  73  |       // 3. CART
  74  |       if (url.includes('/api/cart')) {
  75  |         if (method === 'POST' && url.includes('/items')) {
  76  |           const existing = state.items.find(i => i.productId === body.productId && (i.variantId || undefined) === (body.variantId || undefined));
  77  |           if (existing) existing.quantity += (body.quantity ?? 1);
  78  |           else {
  79  |             const newItem = toCartItem(body.productId, body.quantity ?? 1);
  80  |             if (newItem) state.items.push(newItem);
  81  |           }
  82  |         } else if (method === 'PATCH' && url.includes('/items')) {
  83  |           const existing = state.items.find(i => i.productId === body.productId && (i.variantId || undefined) === (body.variantId || undefined));
  84  |           if (existing) existing.quantity = body.quantity;
  85  |         } else if (method === 'DELETE' && url.includes('/items')) {
  86  |           state.items = state.items.filter(i => !(i.productId === body.productId && (i.variantId || undefined) === (body.variantId || undefined)));
  87  |         } else if (method === 'DELETE') {
  88  |           state.items = [];
  89  |         }
  90  |         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'c1', userId: 'u_v10', items: [...state.items], updatedAt: nowIso }) });
  91  |       }
  92  | 
  93  |       // 4. DISCOUNTS
  94  |       if (url.includes('/api/discounts/validate')) {
  95  |         if (body.code === 'BEE10') {
  96  |           return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, discountAmount: 1500, discount: { id: 'd1', code: 'BEE10', type: 'percentage', value: 10 } }) });
  97  |         }
  98  |         return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid code' }) });
  99  |       }
  100 | 
  101 |       // 5. CHECKOUT SESSION + FINALIZATION
  102 |       if (url.includes('/api/checkout/create-payment-intent') && method === 'POST') {
  103 |         checkoutAddress = body.shippingAddress;
  104 |         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  105 |           clientSecret: 'pi_v10_secret_v10', paymentIntentId: 'pi_v10', orderId: 'ORD_123',
  106 |           amount: 13500, paymentStatus: 'requires_payment_method',
  107 |           expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  108 |         }) });
  109 |       }
  110 |       if (url.includes('/api/checkout/verify') && method === 'POST') {
  111 |         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, orderId: 'ORD_123', status: 'processing' }) });
  112 |       }
  113 |       if (url.includes('/api/orders/ORD_123') && method === 'GET') {
  114 |         return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  115 |           id: 'ORD_123', userId: 'u_v10', status: 'confirmed', paymentState: 'paid',
  116 |           total: 13500, shippingAmount: 0, items: state.items.map(item => ({
  117 |             productId: item.productId, name: item.name, unitPrice: item.priceSnapshot, quantity: item.quantity,
  118 |           })), shippingAddress: checkoutAddress, customerEmail: 'client@hive.art',
  119 |           customerName: 'Industrial Tester', createdAt: nowIso, updatedAt: nowIso,
  120 |         }) });
  121 |       }
  122 | 
  123 |       // 6. DEFAULT (Catch-all for stability)
  124 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  125 |     });
  126 | 
  127 |     if (page.url() === 'about:blank') {
  128 |       await page.goto('/');
  129 |     }
  130 |     await page.evaluate(() => localStorage.clear());
  131 |   }
  132 | 
  133 |   test.beforeEach(async ({ page }) => {
  134 |     test.setTimeout(90000);
  135 |     await setupSubstrateMocks(page);
  136 |   });
  137 | 
  138 |   test('Full Life Cycle: Physical Product Purchase', async ({ page }) => {
  139 |     await page.goto('/products');
  140 |     const firstProduct = page.locator('[data-testid="product-card"]').filter({ hasText: 'Physical Masterpiece' });
> 141 |     await expect(firstProduct).toBeVisible({ timeout: 20000 });
      |                                ^ Error: expect(locator).toBeVisible() failed
  142 |     await firstProduct.hover();
  143 |     await firstProduct.getByTestId('quick-add').click();
  144 | 
  145 |     await expect(page.locator('h2', { hasText: /Cart/i })).toBeVisible({ timeout: 20000 });
  146 |     await page.getByRole('link', { name: /Checkout/i }).click();
  147 |     await page.getByTestId('cart-drawer').waitFor({ state: 'detached', timeout: 20000 });
  148 |     
  149 |     await page.waitForURL(/\/checkout/, { timeout: 20000 });
  150 |     await page.locator('#checkout-street').fill('777 Neon Blvd');
  151 |     await page.locator('#checkout-city').fill('Metropolis');
  152 |     await page.locator('#checkout-state').fill('CA');
  153 |     await page.locator('#checkout-zip').fill('90210');
  154 |     
  155 |     await page.getByRole('button', { name: /continue to shipping/i }).click();
  156 |     await expect(page.getByText(/Delivery Speed/i)).toBeVisible({ timeout: 20000 });
  157 |     
  158 |     await page.getByRole('button', { name: /continue to payment/i }).click();
  159 |     await expect(page.getByText(/Secure Payment/i)).toBeVisible({ timeout: 20000 });
  160 |     
  161 |     await page.locator('input[placeholder*="Discount"]').fill('BEE10');
  162 |     await page.getByRole('button', { name: /Apply/i }).click();
  163 |     await expect(page.getByText(/BEE10 applied/i)).toBeVisible({ timeout: 20000 });
  164 | 
  165 |     await page.getByTestId('mock-checkout-button').click();
  166 |     await expect(page.getByText(/Thank you/i)).toBeVisible({ timeout: 40000 });
  167 |   });
  168 | 
  169 |   test('Edge Case: Multi-Currency & Precision Formatting', async ({ page }) => {
  170 |     state.items = [
  171 |       { productId: 'p1', productHandle: 'physical-masterpiece', name: 'Physical Masterpiece', priceSnapshot: 15000, quantity: 2, imageUrl: '...', isDigital: false }
  172 |     ];
  173 |     
  174 |     await page.goto('/cart');
  175 |     await expect(page.getByTestId('cart-total')).toHaveText(/\$300\.00/, { timeout: 20000 });
  176 | 
  177 |     const cartItem = page.locator('[data-testid="cart-item"]').filter({ hasText: 'Physical Masterpiece' });
  178 |     await cartItem.getByTestId('increase-quantity').click();
  179 |     
  180 |     await expect(cartItem.getByTestId('item-quantity')).toHaveText('3', { timeout: 20000 });
  181 |     await expect(page.getByTestId('cart-total')).toHaveText(/\$450\.00/, { timeout: 20000 });
  182 |   });
  183 | 
  184 |   test('Constraint Validation: Sold Out Product', async ({ page }) => {
  185 |     await page.goto('/products');
  186 |     const soldOutProduct = page.locator('[data-testid="product-card"]').filter({ hasText: 'Sold Out Artifact' });
  187 |     await expect(soldOutProduct.getByTestId('sold-out-badge')).toBeVisible({ timeout: 20000 });
  188 |   });
  189 | 
  190 |   test('Digital Workflow: Instant Fulfillment', async ({ page }) => {
  191 |     state.items = [
  192 |       { productId: 'p2', productHandle: 'digital-genesis', name: 'Digital Genesis', priceSnapshot: 2500, quantity: 1, imageUrl: '...', isDigital: true }
  193 |     ];
  194 |     
  195 |     await page.goto('/checkout');
  196 |     await page.locator('#checkout-street').fill('Digital Way 1');
  197 |     await page.locator('#checkout-city').fill('CyberCity');
  198 |     await page.locator('#checkout-state').fill('NE');
  199 |     await page.locator('#checkout-zip').fill('10101');
  200 |     
  201 |     await page.getByRole('button', { name: /continue to payment/i }).click();
  202 |     await expect(page.getByText(/Instant digital fulfillment/i)).toBeVisible({ timeout: 20000 });
  203 |   });
  204 | 
  205 |   test('Search & Filter Industrial Performance', async ({ page }) => {
  206 |     await page.goto('/products');
  207 |     const searchInput = page.locator('input[placeholder*="Search"]');
  208 |     
  209 |     await searchInput.fill('Digital');
  210 |     await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1, { timeout: 20000 });
  211 |     await expect(page.getByText('Digital Genesis')).toBeVisible({ timeout: 20000 });
  212 |     
  213 |     await searchInput.fill('');
  214 |     await expect(page.locator('[data-testid="product-card"]')).toHaveCount(3, { timeout: 20000 });
  215 |   });
  216 | });
  217 | 
```