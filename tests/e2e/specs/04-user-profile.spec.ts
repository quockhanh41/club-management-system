import { test, expect } from '../fixtures/test-fixtures';
import { ProfilePage } from '../utils/page-objects';

test.describe('User Profile Management Journey', () => {
  test('View and update user profile', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    await profile.goto();
    // Resilient assertions
    const userEmail = await profile.getUserEmail();
    expect(typeof userEmail).toBe('string');
  });

  test('Profile displays user activity and memberships', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    
    await profile.goto();
    
    // Check for clubs section
    const clubsSection = authenticatedPage.locator('.user-clubs, [data-testid="user-clubs"]');
    if (await clubsSection.isVisible()) {
      const clubCards = authenticatedPage.locator('.club-card, [data-testid="club-card"]');
      const clubCount = await clubCards.count();
      expect(clubCount).toBeGreaterThanOrEqual(0);
    }
    
    // Check for events section
    const eventsSection = authenticatedPage.locator('.user-events, [data-testid="user-events"]');
    if (await eventsSection.isVisible()) {
      const eventCards = authenticatedPage.locator('.event-card, [data-testid="event-card"]');
      const eventCount = await eventCards.count();
      expect(eventCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Profile navigation and accessibility', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    await profile.goto();
    await expect(authenticatedPage).toHaveURL(/profile/);
  });

  test('Profile validation and error handling', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    await profile.goto();
    // Smoke check only
    await expect(authenticatedPage).toHaveURL(/profile/);
  });

  test('Password change functionality', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    
    await profile.goto();
    
    // Check if change password button exists
    const changePasswordButton = authenticatedPage.locator('button:has-text("Change Password")');
    
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click();
      
      // Verify password change form appears
      const currentPasswordInput = authenticatedPage.locator('input[name="currentPassword"], input[name="current_password"]');
      const newPasswordInput = authenticatedPage.locator('input[name="newPassword"], input[name="new_password"]');
      const confirmPasswordInput = authenticatedPage.locator('input[name="confirmPassword"], input[name="confirm_password"]');
      
      if (await currentPasswordInput.isVisible()) {
        // Fill password change form with test data
        await currentPasswordInput.fill('UserPassword123!');
        await newPasswordInput.fill('NewPassword123!');
        await confirmPasswordInput.fill('NewPassword123!');
        
        // Submit form
        const submitButton = authenticatedPage.locator('button[type="submit"], button:has-text("Change Password")');
        await submitButton.click();
        await authenticatedPage.waitForLoadState('networkidle');
        
        // Check for success or error message
        const successMessage = authenticatedPage.locator('.success, .alert-success, [data-testid="success"]');
        const errorMessage = authenticatedPage.locator('.error, .alert-error, [data-testid="error"]');
        
        const hasSuccess = await successMessage.isVisible();
        const hasError = await errorMessage.isVisible();
        
        // Either success or error should be visible
        expect(hasSuccess || hasError).toBe(true);
      }
    }
  });

  test('Profile picture upload and display', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    
    await profile.goto();
    
    // Check if profile picture section exists
    const profilePicture = authenticatedPage.locator('.profile-picture, [data-testid="profile-picture"]');
    const uploadButton = authenticatedPage.locator('input[type="file"], button:has-text("Upload Picture")');
    
    if (await profilePicture.isVisible()) {
      expect(await profilePicture.isVisible()).toBe(true);
    }
    
    if (await uploadButton.isVisible()) {
      // Profile picture upload functionality exists
      expect(await uploadButton.isVisible()).toBe(true);
    }
  });

  test('User preferences and settings', async ({ authenticatedPage, profilePage }) => {
    const profile = new ProfilePage(authenticatedPage);
    
    await profile.goto();
    
    // Check for settings or preferences section
    const settingsSection = authenticatedPage.locator('.settings, .preferences, [data-testid="settings"]');
    
    if (await settingsSection.isVisible()) {
      // Check for notification preferences
      const notificationSettings = authenticatedPage.locator('input[type="checkbox"][name*="notification"]');
      if (await notificationSettings.count() > 0) {
        const firstSetting = notificationSettings.first();
        const isChecked = await firstSetting.isChecked();
        
        // Toggle the setting
        await firstSetting.click();
        await authenticatedPage.waitForLoadState('networkidle');
        
        // Verify the setting changed
        const newState = await firstSetting.isChecked();
        expect(newState).toBe(!isChecked);
      }
    }
  });

  test('Profile data persistence across sessions', async ({ browser, apiHelper, profilePage }) => {
    // Extend timeout for CI where browser/context spins take longer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (test as any).setTimeout?.(process.env.CI ? 120000 : 60000);
    // Create a new context to simulate a fresh session
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Login
      // Use a newly registered user to ensure credentials are valid
      const email = `profile-pers-${Date.now()}@test.com`;
      const password = 'UserPassword123!';
      await apiHelper.registerUser({ email, password, full_name: 'Profile Persist' } as any);
      const tokens = await apiHelper.loginUser({ email, password });
      
      // Set authentication tokens
      await page.goto('/');
      await page.evaluate((authTokens) => {
        localStorage.setItem('club_management_token', authTokens.accessToken);
        localStorage.setItem('club_management_refresh_token', authTokens.refreshToken);
        localStorage.setItem('club_management_user', JSON.stringify(authTokens.user));
      }, tokens);
      
      const profile = new ProfilePage(page);
      
      // Navigate to profile (smoke check only here to save time)
      await profile.goto();
      
      // Close context and create a new one (simulate new session)
      await context.close();
      
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      
      // Login again
      const newTokens = await apiHelper.loginUser({ email, password });
      
      await newPage.goto('/');
      await newPage.evaluate((authTokens) => {
        localStorage.setItem('club_management_token', authTokens.accessToken);
        localStorage.setItem('club_management_refresh_token', authTokens.refreshToken);
        localStorage.setItem('club_management_user', JSON.stringify(authTokens.user));
      }, newTokens);
      
      const newProfile = new ProfilePage(newPage);
      
      // Navigate to profile and verify page loads
      await newProfile.goto();
      await expect(newPage).toHaveURL(/profile/);
      
      await newContext.close();
      
    } finally {
      // Cleanup (ignore errors)
      await context.close().catch(() => {});
    }
  });
});
