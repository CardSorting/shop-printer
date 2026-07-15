# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: industrialized-commerce-v10.spec.ts >> Industrialized Commerce Suite V10 >> Digital Workflow: Instant Fulfillment
- Location: e2e/industrialized-commerce-v10.spec.ts:190:3

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.fill: Test timeout of 90000ms exceeded.
Call log:
  - waiting for locator('#checkout-street')

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
        - img [ref=e37]
        - heading "Nothing on your tray yet" [level=1] [ref=e40]
        - paragraph [ref=e41]: Your cart’s empty—but the room isn’t. See what the vendors are serving and what the regulars are ordering.
        - link "Browse the Menu" [ref=e42] [cursor=pointer]:
          - /url: /collections/bestsellers
        - paragraph [ref=e43]: Come for the food, stay for the people—and the space.
    - contentinfo [ref=e44]:
      - generic [ref=e46]:
        - region "WoodBine" [ref=e48]:
          - generic [ref=e49]:
            - link "Woodbine Food Hall" [ref=e50] [cursor=pointer]:
              - /url: /
              - img "Woodbine Food Hall" [ref=e51]
            - generic [ref=e52]:
              - link "545 West 700 South, Salt Lake City, UT 84101" [ref=e53] [cursor=pointer]:
                - /url: https://www.google.com/maps/search/?api=1&query=545%20West%20700%20South%2C%20Salt%20Lake%20City%2C%20UT%2084101
              - link "hello@woodbineslc.com" [ref=e54] [cursor=pointer]:
                - /url: mailto:hello@woodbineslc.com
          - navigation "Footer navigation" [ref=e56]:
            - generic [ref=e57]:
              - heading "Explore" [level=3] [ref=e58]
              - list [ref=e59]:
                - listitem [ref=e60]:
                  - link "Menu" [ref=e61] [cursor=pointer]:
                    - /url: /collections/bestsellers
                - listitem [ref=e62]:
                  - link "Stories" [ref=e63] [cursor=pointer]:
                    - /url: /blog
            - generic [ref=e64]:
              - heading "Visit" [level=3] [ref=e65]
              - list [ref=e66]:
                - listitem [ref=e67]:
                  - link "Hours & directions" [ref=e68] [cursor=pointer]:
                    - /url: /support
                - listitem [ref=e69]:
                  - link "Private events" [ref=e70] [cursor=pointer]:
                    - /url: /support?contact=true
            - generic [ref=e71]:
              - heading "Account" [level=3] [ref=e72]
              - list [ref=e73]:
                - listitem [ref=e74]:
                  - link "Sign in" [ref=e75] [cursor=pointer]:
                    - /url: /login
                - listitem [ref=e76]:
                  - link "Orders" [ref=e77] [cursor=pointer]:
                    - /url: /orders
                - listitem [ref=e78]:
                  - link "Help" [ref=e79] [cursor=pointer]:
                    - /url: /support
        - separator [ref=e80]
        - generic [ref=e82]:
          - region "Join the Neighborhood Table" [ref=e83]:
            - generic [ref=e85]:
              - complementary [ref=e86]:
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - generic [ref=e90]: "01"
                    - img [ref=e91]
                    - generic [ref=e92]:
                      - generic [ref=e93]: Salt City BBQ
                      - generic [ref=e94]: Smoke & fire
                  - generic [ref=e95]:
                    - generic [ref=e96]: "02"
                    - img [ref=e97]
                    - generic [ref=e98]:
                      - generic [ref=e99]: Deadpan Pizza
                      - generic [ref=e100]: Hall sandos
                  - generic [ref=e101]:
                    - generic [ref=e102]: "03"
                    - img [ref=e103]
                    - generic [ref=e104]:
                      - generic [ref=e105]: The room
                      - generic [ref=e106]: Communal tables
                - generic [ref=e107]:
                  - generic [ref=e108]: Warehouse District · SLC
                  - strong [ref=e109]: Nine kitchens
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - generic [ref=e112]:
                    - paragraph [ref=e113]: From the hall
                    - generic [ref=e114]: Weekly digest
                  - heading "Join the Neighborhood Table" [level=2] [ref=e115]:
                    - text: Join the
                    - emphasis [ref=e116]: Neighborhood Table
                  - paragraph [ref=e118]: Vendor spotlights, community nights, and the stories behind the room—so you never miss a reason to come back and pull up a chair.
                - list "What you will receive" [ref=e119]:
                  - listitem [ref=e120]:
                    - generic [ref=e121]: "01"
                    - img [ref=e123]
                    - generic [ref=e128]:
                      - strong [ref=e129]: Vendor spotlights
                      - generic [ref=e130]: New counters, signature plates, and who is on the line this week.
                  - listitem [ref=e131]:
                    - generic [ref=e132]: "02"
                    - img [ref=e134]
                    - generic [ref=e137]:
                      - strong [ref=e138]: Community nights
                      - generic [ref=e139]: Trivia, markets, and the gatherings that fill the warehouse room.
                  - listitem [ref=e140]:
                    - generic [ref=e141]: "03"
                    - img [ref=e143]
                    - generic [ref=e145]:
                      - strong [ref=e146]: Stories from the hall
                      - generic [ref=e147]: Regulars, recipes, and the people behind the barrel roof.
                - generic [ref=e148]:
                  - paragraph [ref=e149]: Your seat at the table
                  - generic [ref=e150]:
                    - generic [ref=e151]:
                      - generic [ref=e152]: Email address
                      - img
                      - textbox "Email address" [ref=e153]:
                        - /placeholder: you@example.com
                    - button "Subscribe" [ref=e154] [cursor=pointer]:
                      - text: Subscribe
                      - img [ref=e155]
                  - paragraph [ref=e157]: One email when it matters. Unsubscribe anytime—we'd rather see you at a communal table anyway.
            - generic [ref=e159]:
              - generic [ref=e160]: ◆Mozz
              - generic [ref=e161]: ◆DeadPan
              - generic [ref=e162]: ◆Salt City BBQ
              - generic [ref=e163]: ◆Dom's Burgers
              - generic [ref=e164]: ◆Tosh's Ramen
              - generic [ref=e165]: ◆Shwe Letyar
              - generic [ref=e166]: ◆Chunky
              - generic [ref=e167]: ◆Marcato
              - generic [ref=e168]: ◆Caracas Grill
              - generic [ref=e169]: ◆Mozz
              - generic [ref=e170]: ◆DeadPan
              - generic [ref=e171]: ◆Salt City BBQ
              - generic [ref=e172]: ◆Dom's Burgers
              - generic [ref=e173]: ◆Tosh's Ramen
              - generic [ref=e174]: ◆Shwe Letyar
              - generic [ref=e175]: ◆Chunky
              - generic [ref=e176]: ◆Marcato
              - generic [ref=e177]: ◆Caracas Grill
          - generic [ref=e178]:
            - generic [ref=e179]:
              - img [ref=e180]
              - generic [ref=e183]: US / USD
              - img [ref=e184]
            - generic "Accepted payment methods" [ref=e186]:
              - img [ref=e187]
              - generic [ref=e189]: Mastercard
              - generic [ref=e190]: PayPal
              - generic [ref=e191]: Stripe
              - generic [ref=e192]:
                - img [ref=e193]
                - text: Secure checkout
        - separator [ref=e196]
        - generic [ref=e197]:
          - paragraph [ref=e198]: © 2026 WoodBine. All Rights Reserved.
          - paragraph [ref=e199]: Nine kitchens · one roof · pull up a chair.
  - generic [ref=e204] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e205]:
      - img [ref=e206]
    - generic [ref=e209]:
      - button "Open issues overlay" [ref=e210]:
        - generic [ref=e211]:
          - generic [ref=e212]: "4"
          - generic [ref=e213]: "5"
        - generic [ref=e214]:
          - text: Issue
          - generic [ref=e215]: s
      - button "Collapse issues badge" [ref=e216]:
        - img [ref=e217]
  - alert [ref=e219]
```

# Test source

```ts
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
  141 |     await expect(firstProduct).toBeVisible({ timeout: 20000 });
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
> 196 |     await page.locator('#checkout-street').fill('Digital Way 1');
      |                                            ^ Error: locator.fill: Test timeout of 90000ms exceeded.
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