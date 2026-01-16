import { test, expect } from '@playwright/test';

/**
 * Smoke test - Simple test to verify E2E setup is working
 */
test.describe('Smoke Tests', () => {
  test('basic playwright is working', async ({ page }) => {
    // Just verify Playwright can navigate
    await page.goto('https://example.com');
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('✅ Smoke test passed - Playwright is working');
  });

  test('can reach frontend service', async ({ page }) => {
    // Try to reach our frontend
    const response = await page.goto('http://frontend:3000');
    console.log(`Frontend response status: ${response?.status()}`);
    expect(response?.status()).toBeLessThan(500);
  });
});
