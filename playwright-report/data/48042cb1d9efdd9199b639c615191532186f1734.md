# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: industrialized-commerce-v10.spec.ts >> Industrialized Commerce Suite V10 >> Edge Case: Multi-Currency & Precision Formatting
- Location: e2e/industrialized-commerce-v10.spec.ts:169:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByTestId('cart-total')
Expected pattern: /\$300\.00/
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 20000ms
  - waiting for getByTestId('cart-total')

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
        - generic [ref=e36]:
          - navigation [ref=e37]:
            - link "Home" [ref=e38] [cursor=pointer]:
              - /url: /
            - img [ref=e39]
            - generic [ref=e41]: Your Order
          - generic [ref=e43]:
            - heading "Your Order" [level=1] [ref=e44]
            - paragraph [ref=e45]: Your cart’s empty—but the room isn’t. See what the vendors are serving and what the regulars are ordering.
        - generic [ref=e46]:
          - generic [ref=e49]:
            - img [ref=e51]
            - heading "Nothing on your tray yet" [level=2] [ref=e54]
            - paragraph [ref=e55]: Your cart’s empty—but the room isn’t. See what the vendors are serving and what the regulars are ordering.
            - generic [ref=e56]:
              - link "Browse the Menu" [ref=e57] [cursor=pointer]:
                - /url: /products
              - link "Back to Home" [ref=e58] [cursor=pointer]:
                - /url: /
          - generic [ref=e59]:
            - generic [ref=e60]:
              - heading "What the room recommends" [level=2] [ref=e61]
              - link "View All" [ref=e62] [cursor=pointer]:
                - /url: /products
                - text: View All
                - img [ref=e63]
            - generic [ref=e65]:
              - article [ref=e66]:
                - link "Physical Masterpiece" [ref=e67] [cursor=pointer]:
                  - /url: /products/physical-masterpiece
                  - img "Physical Masterpiece" [ref=e68]
                - heading "Physical Masterpiece" [level=4] [ref=e70]:
                  - link "Physical Masterpiece" [ref=e71] [cursor=pointer]:
                    - /url: /products/physical-masterpiece
                - generic [ref=e72]:
                  - paragraph [ref=e73]: $150.00
                  - button [ref=e74]:
                    - img [ref=e75]
              - article [ref=e76]:
                - link "Digital Genesis" [ref=e77] [cursor=pointer]:
                  - /url: /products/digital-genesis
                  - img "Digital Genesis" [ref=e78]
                - heading "Digital Genesis" [level=4] [ref=e80]:
                  - link "Digital Genesis" [ref=e81] [cursor=pointer]:
                    - /url: /products/digital-genesis
                - generic [ref=e82]:
                  - paragraph [ref=e83]: $25.00
                  - button [ref=e84]:
                    - img [ref=e85]
              - article [ref=e86]:
                - link "Sold Out Artifact" [ref=e87] [cursor=pointer]:
                  - /url: /products/sold-out-artifact
                  - img "Sold Out Artifact" [ref=e88]
                - heading "Sold Out Artifact" [level=4] [ref=e90]:
                  - link "Sold Out Artifact" [ref=e91] [cursor=pointer]:
                    - /url: /products/sold-out-artifact
                - generic [ref=e92]:
                  - paragraph [ref=e93]: $99.00
                  - button [ref=e94]:
                    - img [ref=e95]
    - contentinfo [ref=e96]:
      - generic [ref=e98]:
        - region "WoodBine" [ref=e100]:
          - generic [ref=e101]:
            - link "Woodbine Food Hall" [ref=e102] [cursor=pointer]:
              - /url: /
              - img "Woodbine Food Hall" [ref=e103]
            - generic [ref=e104]:
              - link "545 West 700 South, Salt Lake City, UT 84101" [ref=e105] [cursor=pointer]:
                - /url: https://www.google.com/maps/search/?api=1&query=545%20West%20700%20South%2C%20Salt%20Lake%20City%2C%20UT%2084101
              - link "hello@woodbineslc.com" [ref=e106] [cursor=pointer]:
                - /url: mailto:hello@woodbineslc.com
          - navigation "Footer navigation" [ref=e108]:
            - generic [ref=e109]:
              - heading "Explore" [level=3] [ref=e110]
              - list [ref=e111]:
                - listitem [ref=e112]:
                  - link "Menu" [ref=e113] [cursor=pointer]:
                    - /url: /collections/bestsellers
                - listitem [ref=e114]:
                  - link "Stories" [ref=e115] [cursor=pointer]:
                    - /url: /blog
            - generic [ref=e116]:
              - heading "Visit" [level=3] [ref=e117]
              - list [ref=e118]:
                - listitem [ref=e119]:
                  - link "Hours & directions" [ref=e120] [cursor=pointer]:
                    - /url: /support
                - listitem [ref=e121]:
                  - link "Private events" [ref=e122] [cursor=pointer]:
                    - /url: /support?contact=true
            - generic [ref=e123]:
              - heading "Account" [level=3] [ref=e124]
              - list [ref=e125]:
                - listitem [ref=e126]:
                  - link "Sign in" [ref=e127] [cursor=pointer]:
                    - /url: /login
                - listitem [ref=e128]:
                  - link "Orders" [ref=e129] [cursor=pointer]:
                    - /url: /orders
                - listitem [ref=e130]:
                  - link "Help" [ref=e131] [cursor=pointer]:
                    - /url: /support
        - separator [ref=e132]
        - generic [ref=e134]:
          - region "Join the Neighborhood Table" [ref=e135]:
            - generic [ref=e137]:
              - complementary [ref=e138]:
                - generic [ref=e140]:
                  - generic [ref=e141]:
                    - generic [ref=e142]: "01"
                    - img [ref=e143]
                    - generic [ref=e144]:
                      - generic [ref=e145]: Salt City BBQ
                      - generic [ref=e146]: Smoke & fire
                  - generic [ref=e147]:
                    - generic [ref=e148]: "02"
                    - img [ref=e149]
                    - generic [ref=e150]:
                      - generic [ref=e151]: Deadpan Pizza
                      - generic [ref=e152]: Hall sandos
                  - generic [ref=e153]:
                    - generic [ref=e154]: "03"
                    - img [ref=e155]
                    - generic [ref=e156]:
                      - generic [ref=e157]: The room
                      - generic [ref=e158]: Communal tables
                - generic [ref=e159]:
                  - generic [ref=e160]: Warehouse District · SLC
                  - strong [ref=e161]: Nine kitchens
              - generic [ref=e162]:
                - generic [ref=e163]:
                  - generic [ref=e164]:
                    - paragraph [ref=e165]: From the hall
                    - generic [ref=e166]: Weekly digest
                  - heading "Join the Neighborhood Table" [level=2] [ref=e167]:
                    - text: Join the
                    - emphasis [ref=e168]: Neighborhood Table
                  - paragraph [ref=e170]: Vendor spotlights, community nights, and the stories behind the room—so you never miss a reason to come back and pull up a chair.
                - list "What you will receive" [ref=e171]:
                  - listitem [ref=e172]:
                    - generic [ref=e173]: "01"
                    - img [ref=e175]
                    - generic [ref=e180]:
                      - strong [ref=e181]: Vendor spotlights
                      - generic [ref=e182]: New counters, signature plates, and who is on the line this week.
                  - listitem [ref=e183]:
                    - generic [ref=e184]: "02"
                    - img [ref=e186]
                    - generic [ref=e189]:
                      - strong [ref=e190]: Community nights
                      - generic [ref=e191]: Trivia, markets, and the gatherings that fill the warehouse room.
                  - listitem [ref=e192]:
                    - generic [ref=e193]: "03"
                    - img [ref=e195]
                    - generic [ref=e197]:
                      - strong [ref=e198]: Stories from the hall
                      - generic [ref=e199]: Regulars, recipes, and the people behind the barrel roof.
                - generic [ref=e200]:
                  - paragraph [ref=e201]: Your seat at the table
                  - generic [ref=e202]:
                    - generic [ref=e203]:
                      - generic [ref=e204]: Email address
                      - img
                      - textbox "Email address" [ref=e205]:
                        - /placeholder: you@example.com
                    - button "Subscribe" [ref=e206] [cursor=pointer]:
                      - text: Subscribe
                      - img [ref=e207]
                  - paragraph [ref=e209]: One email when it matters. Unsubscribe anytime—we'd rather see you at a communal table anyway.
            - generic [ref=e211]:
              - generic [ref=e212]: ◆Mozz
              - generic [ref=e213]: ◆DeadPan
              - generic [ref=e214]: ◆Salt City BBQ
              - generic [ref=e215]: ◆Dom's Burgers
              - generic [ref=e216]: ◆Tosh's Ramen
              - generic [ref=e217]: ◆Shwe Letyar
              - generic [ref=e218]: ◆Chunky
              - generic [ref=e219]: ◆Marcato
              - generic [ref=e220]: ◆Caracas Grill
              - generic [ref=e221]: ◆Mozz
              - generic [ref=e222]: ◆DeadPan
              - generic [ref=e223]: ◆Salt City BBQ
              - generic [ref=e224]: ◆Dom's Burgers
              - generic [ref=e225]: ◆Tosh's Ramen
              - generic [ref=e226]: ◆Shwe Letyar
              - generic [ref=e227]: ◆Chunky
              - generic [ref=e228]: ◆Marcato
              - generic [ref=e229]: ◆Caracas Grill
          - generic [ref=e230]:
            - generic [ref=e231]:
              - img [ref=e232]
              - generic [ref=e235]: US / USD
              - img [ref=e236]
            - generic "Accepted payment methods" [ref=e238]:
              - img [ref=e239]
              - generic [ref=e241]: Mastercard
              - generic [ref=e242]: PayPal
              - generic [ref=e243]: Stripe
              - generic [ref=e244]:
                - img [ref=e245]
                - text: Secure checkout
        - separator [ref=e248]
        - generic [ref=e249]:
          - paragraph [ref=e250]: © 2026 WoodBine. All Rights Reserved.
          - paragraph [ref=e251]: Nine kitchens · one roof · pull up a chair.
  - generic [ref=e256] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e257]:
      - img [ref=e258]
    - generic [ref=e261]:
      - button "Open issues overlay" [ref=e262]:
        - generic [ref=e263]:
          - generic [ref=e264]: "3"
          - generic [ref=e265]: "4"
        - generic [ref=e266]:
          - text: Issue
          - generic [ref=e267]: s
      - button "Collapse issues badge" [ref=e268]:
        - img [ref=e269]
  - alert [ref=e271]
```

# Test source

```ts
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
> 175 |     await expect(page.getByTestId('cart-total')).toHaveText(/\$300\.00/, { timeout: 20000 });
      |                                                  ^ Error: expect(locator).toHaveText(expected) failed
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