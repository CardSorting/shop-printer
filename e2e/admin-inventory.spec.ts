import { test, expect } from '@playwright/test';

test.describe('Admin Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@meowacc.io');
    await page.fill('input[type="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    
    // Verify login success
    await expect(page).toHaveURL('/');
    
    // Navigate to admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should allow an admin to create a new product', async ({ page }) => {
    // 1. Navigate to Products management
    await page.locator('aside').getByRole('link', { name: /^Products$/ }).click();
    await expect(page).toHaveURL(/\/admin\/products/);

    // 2. Click "Create Product" or "Add Product"
    await page.click('[data-testid="add-product-button"]');
    await expect(page).toHaveURL(/\/admin\/products\/new/);

    // 3. Fill out the form
    await page.waitForSelector('[data-testid="product-name"]', { timeout: 15000 });
    const productName = `E2E Test Card ${Date.now()}`;
    await page.fill('[data-testid="product-name"]', productName);
    await page.fill('textarea[data-testid="product-description"]', 'This is a test card created via Playwright E2E.');
    await page.fill('input[data-testid="product-price"]', '49.99');
    await page.fill('input[data-testid="product-stock"]', '100');
    await page.fill('input[data-testid="product-image-url"]', 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=400');
    
    // Select category
    await page.selectOption('select[data-testid="product-category"]', 'collectibles');

    // 4. Save
    await page.click('button[data-testid="save-product"]');

    // 5. Verify redirect back to products list or success message
    await expect(page).toHaveURL(/\/admin\/products/);
    await expect(page.locator('text=Product created successfully')).toBeVisible();

    // 6. Verify product appears in the list
    await expect(page.locator(`text=${productName}`)).toBeVisible();
  });
});
