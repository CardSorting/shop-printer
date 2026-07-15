# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: industrialized-commerce-v10.spec.ts >> Industrialized Commerce Suite V10 >> Search & Filter Industrial Performance
- Location: e2e/industrialized-commerce-v10.spec.ts:205:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-testid="product-card"]')
Expected: 1
Received: 0
Timeout:  20000ms

Call log:
  - Expect "toHaveCount" with timeout 20000ms
  - waiting for locator('[data-testid="product-card"]')
    24 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Woodbine Food Hall" [ref=e5] [cursor=pointer]:
          - /url: /
          - img "Woodbine Food Hall" [ref=e6]
        - generic:
          - link "Menu":
            - /url: /collections/bestsellers
          - link "Visit":
            - /url: /support
          - link "Community":
            - /url: /blog
        - generic [ref=e7]:
          - generic:
            - img
          - textbox "Search vendors & dishes..." [active] [ref=e8]: Digital
        - generic [ref=e9]:
          - button [ref=e11]:
            - img [ref=e12]
          - generic [ref=e17]:
            - link [ref=e18] [cursor=pointer]:
              - /url: /account
              - img [ref=e19]
            - generic:
              - generic:
                - generic:
                  - paragraph: Industrial Tester
                - link "Account":
                  - /url: /account
                - button "Sign Out"
          - button "Open cart" [ref=e22]:
            - img [ref=e23]
            - generic [ref=e27]: "0"
    - main [ref=e28]:
      - generic [ref=e31]:
        - heading "404" [level=1] [ref=e32]
        - heading "This page could not be found." [level=2] [ref=e34]
    - contentinfo [ref=e35]:
      - generic [ref=e37]:
        - region "WoodBine" [ref=e39]:
          - generic [ref=e40]:
            - link "Woodbine Food Hall" [ref=e41] [cursor=pointer]:
              - /url: /
              - img "Woodbine Food Hall" [ref=e42]
            - generic [ref=e43]:
              - link "545 West 700 South, Salt Lake City, UT 84101" [ref=e44] [cursor=pointer]:
                - /url: https://www.google.com/maps/search/?api=1&query=545%20West%20700%20South%2C%20Salt%20Lake%20City%2C%20UT%2084101
              - link "hello@woodbineslc.com" [ref=e45] [cursor=pointer]:
                - /url: mailto:hello@woodbineslc.com
          - navigation "Footer navigation" [ref=e47]:
            - generic [ref=e48]:
              - heading "Explore" [level=3] [ref=e49]
              - list [ref=e50]:
                - listitem [ref=e51]:
                  - link "Menu" [ref=e52] [cursor=pointer]:
                    - /url: /collections/bestsellers
                - listitem [ref=e53]:
                  - link "Stories" [ref=e54] [cursor=pointer]:
                    - /url: /blog
            - generic [ref=e55]:
              - heading "Visit" [level=3] [ref=e56]
              - list [ref=e57]:
                - listitem [ref=e58]:
                  - link "Hours & directions" [ref=e59] [cursor=pointer]:
                    - /url: /support
                - listitem [ref=e60]:
                  - link "Private events" [ref=e61] [cursor=pointer]:
                    - /url: /support?contact=true
            - generic [ref=e62]:
              - heading "Account" [level=3] [ref=e63]
              - list [ref=e64]:
                - listitem [ref=e65]:
                  - link "Sign in" [ref=e66] [cursor=pointer]:
                    - /url: /login
                - listitem [ref=e67]:
                  - link "Orders" [ref=e68] [cursor=pointer]:
                    - /url: /orders
                - listitem [ref=e69]:
                  - link "Help" [ref=e70] [cursor=pointer]:
                    - /url: /support
        - separator [ref=e71]
        - generic [ref=e73]:
          - region "Join the Neighborhood Table" [ref=e74]:
            - generic [ref=e76]:
              - complementary [ref=e77]:
                - generic [ref=e79]:
                  - generic [ref=e80]:
                    - generic [ref=e81]: "01"
                    - img [ref=e82]
                    - generic [ref=e83]:
                      - generic [ref=e84]: Salt City BBQ
                      - generic [ref=e85]: Smoke & fire
                  - generic [ref=e86]:
                    - generic [ref=e87]: "02"
                    - img [ref=e88]
                    - generic [ref=e89]:
                      - generic [ref=e90]: Deadpan Pizza
                      - generic [ref=e91]: Hall sandos
                  - generic [ref=e92]:
                    - generic [ref=e93]: "03"
                    - img [ref=e94]
                    - generic [ref=e95]:
                      - generic [ref=e96]: The room
                      - generic [ref=e97]: Communal tables
                - generic [ref=e98]:
                  - generic [ref=e99]: Warehouse District · SLC
                  - strong [ref=e100]: Nine kitchens
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - generic [ref=e103]:
                    - paragraph [ref=e104]: From the hall
                    - generic [ref=e105]: Weekly digest
                  - heading "Join the Neighborhood Table" [level=2] [ref=e106]:
                    - text: Join the
                    - emphasis [ref=e107]: Neighborhood Table
                  - paragraph [ref=e109]: Vendor spotlights, community nights, and the stories behind the room—so you never miss a reason to come back and pull up a chair.
                - list "What you will receive" [ref=e110]:
                  - listitem [ref=e111]:
                    - generic [ref=e112]: "01"
                    - img [ref=e114]
                    - generic [ref=e119]:
                      - strong [ref=e120]: Vendor spotlights
                      - generic [ref=e121]: New counters, signature plates, and who is on the line this week.
                  - listitem [ref=e122]:
                    - generic [ref=e123]: "02"
                    - img [ref=e125]
                    - generic [ref=e128]:
                      - strong [ref=e129]: Community nights
                      - generic [ref=e130]: Trivia, markets, and the gatherings that fill the warehouse room.
                  - listitem [ref=e131]:
                    - generic [ref=e132]: "03"
                    - img [ref=e134]
                    - generic [ref=e136]:
                      - strong [ref=e137]: Stories from the hall
                      - generic [ref=e138]: Regulars, recipes, and the people behind the barrel roof.
                - generic [ref=e139]:
                  - paragraph [ref=e140]: Your seat at the table
                  - generic [ref=e141]:
                    - generic [ref=e142]:
                      - generic [ref=e143]: Email address
                      - img
                      - textbox "Email address" [ref=e144]:
                        - /placeholder: you@example.com
                    - button "Subscribe" [ref=e145] [cursor=pointer]:
                      - text: Subscribe
                      - img [ref=e146]
                  - paragraph [ref=e148]: One email when it matters. Unsubscribe anytime—we'd rather see you at a communal table anyway.
            - generic [ref=e150]:
              - generic [ref=e151]: ◆Mozz
              - generic [ref=e152]: ◆DeadPan
              - generic [ref=e153]: ◆Salt City BBQ
              - generic [ref=e154]: ◆Dom's Burgers
              - generic [ref=e155]: ◆Tosh's Ramen
              - generic [ref=e156]: ◆Shwe Letyar
              - generic [ref=e157]: ◆Chunky
              - generic [ref=e158]: ◆Marcato
              - generic [ref=e159]: ◆Caracas Grill
              - generic [ref=e160]: ◆Mozz
              - generic [ref=e161]: ◆DeadPan
              - generic [ref=e162]: ◆Salt City BBQ
              - generic [ref=e163]: ◆Dom's Burgers
              - generic [ref=e164]: ◆Tosh's Ramen
              - generic [ref=e165]: ◆Shwe Letyar
              - generic [ref=e166]: ◆Chunky
              - generic [ref=e167]: ◆Marcato
              - generic [ref=e168]: ◆Caracas Grill
          - generic [ref=e169]:
            - generic [ref=e170]:
              - img [ref=e171]
              - generic [ref=e174]: US / USD
              - img [ref=e175]
            - generic "Accepted payment methods" [ref=e177]:
              - img [ref=e178]
              - generic [ref=e180]: Mastercard
              - generic [ref=e181]: PayPal
              - generic [ref=e182]: Stripe
              - generic [ref=e183]:
                - img [ref=e184]
                - text: Secure checkout
        - separator [ref=e187]
        - generic [ref=e188]:
          - paragraph [ref=e189]: © 2026 WoodBine. All Rights Reserved.
          - paragraph [ref=e190]: Nine kitchens · one roof · pull up a chair.
  - generic [ref=e195] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e196]:
      - img [ref=e197]
    - generic [ref=e200]:
      - button "Open issues overlay" [ref=e201]:
        - generic [ref=e202]:
          - generic [ref=e203]: "1"
          - generic [ref=e204]: "2"
        - generic [ref=e205]:
          - text: Issue
          - generic [ref=e206]: s
      - button "Collapse issues badge" [ref=e207]:
        - img [ref=e208]
  - alert [ref=e210]
```

# Test source

```ts
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
> 210 |     await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1, { timeout: 20000 });
      |                                                                ^ Error: expect(locator).toHaveCount(expected) failed
  211 |     await expect(page.getByText('Digital Genesis')).toBeVisible({ timeout: 20000 });
  212 |     
  213 |     await searchInput.fill('');
  214 |     await expect(page.locator('[data-testid="product-card"]')).toHaveCount(3, { timeout: 20000 });
  215 |   });
  216 | });
  217 | 
```