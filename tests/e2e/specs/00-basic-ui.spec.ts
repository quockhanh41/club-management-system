import { test, expect } from '@playwright/test';
import { LoginPage, SignupPage, HomePage } from '../utils/page-objects';

test.describe('Basic UI Tests', () => {
  test('Login page loads and has correct elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.waitForLoadState();
    
    // Check that the page loaded correctly (match title from component)
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    
    // Check that form elements exist with correct selectors
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('a:has-text("Sign up")')).toBeVisible();
  });

  test('Signup page loads and has correct elements', async ({ page }) => {
    const signupPage = new SignupPage(page);
    
    await signupPage.goto();
    await signupPage.waitForLoadState();
    
    // Check that the page loaded correctly (match title from component)
    await expect(page.locator('text=Create your account')).toBeVisible();
    
    // Check that form elements exist with correct selectors
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('#terms')).toBeVisible();
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
    await expect(page.locator('a:has-text("Sign in")')).toBeVisible();
  });

  test('Home page loads and has correct navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.goto();
    await homePage.waitForLoadState();
    
    // Check that the page loaded correctly
    await expect(page.locator('header').locator('text=UniVibe')).toBeVisible();
    await expect(page.locator('h1:has-text("Khám phá")')).toBeVisible();
    
    // Check navigation elements (scope to header to avoid duplicates)
    await expect(page.locator('header').locator('a:has-text("Đăng nhập")')).toBeVisible();
    await expect(page.locator('header').locator('a:has-text("Đăng ký")')).toBeVisible();
    
    // Check main sections are present
    await expect(page.locator('text=Câu lạc bộ nổi bật')).toBeVisible();
    await expect(page.locator('text=Hoạt động cộng đồng')).toBeVisible();
  });

  test('Clubs page loads and has search functionality', async ({ page }) => {
    await page.goto('/clubs');
    await page.waitForLoadState('domcontentloaded');
    
    // Check that the page loaded correctly
    await expect(page.locator('text=Khám phá câu lạc bộ')).toBeVisible();
    
    // Check search input exists
    await expect(page.locator('input[placeholder*="Tìm kiếm câu lạc bộ"]')).toBeVisible();
    
    // Check category filter exists (might be a select or custom component)
    const categoryFilter = page.locator('select, [role="combobox"], [data-testid="category-filter"]').first();
    await expect(categoryFilter).toBeVisible();
  });

    test('Events page loads and has search functionality', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('domcontentloaded');

    // Check that the page loaded correctly
    await expect(page.locator('text=Danh sách Sự kiện')).toBeVisible();
    
    // Check search input exists (might be hidden on desktop, visible on mobile)
    const searchInput = page.locator('input[placeholder*="Tìm kiếm sự kiện"]');
    await expect(searchInput).toBeAttached(); // Check it exists in DOM
  });

  test('Navigation between pages works', async ({ page }) => {
    // Helper function to click navigation link (handles both desktop and mobile)
    const clickNavLink = async (linkText: string) => {
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768; // md breakpoint
      
      if (isMobile) {
        // On mobile, navigation is inside Sheet - need to open hamburger menu first
        const menuButton = page.locator('button:has(svg.lucide-menu)');
        const isMenuVisible = await menuButton.isVisible();
        
        if (isMenuVisible) {
          // Check if Sheet is already open
          const sheet = page.locator('[role="dialog"]');
          const isSheetOpen = await sheet.isVisible().catch(() => false);
          
          if (!isSheetOpen) {
            // Force click to bypass animation intercepting
            await menuButton.click({ force: true });
            // Wait for Sheet animation to complete
            await page.waitForTimeout(800);
          }
        }
        
        // Click the link inside the Sheet with force to bypass animation
        const linkInSheet = page.locator('[role="dialog"]').getByRole('link', { name: linkText, exact: true });
        await linkInSheet.click({ force: true });
        
        // Wait for navigation
        await page.waitForTimeout(300);
      } else {
        // On desktop, navigation is in header
        await page.click(`header a:has-text("${linkText}")`);
      }
    };
    
    // Start at home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to clubs
    await clickNavLink('Câu lạc bộ');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/clubs');
    
    // Navigate to events
    await clickNavLink('Sự kiện');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/events');
    
    // Navigate back to home
    await clickNavLink('Trang chủ');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
  });
});
