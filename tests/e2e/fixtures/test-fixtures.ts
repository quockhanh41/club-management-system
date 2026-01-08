import { test as base, Page } from '@playwright/test';
import { APIHelper } from '../utils/api-helper';
import { TestDataManager } from '../utils/test-data-manager';
import { 
  LoginPage, 
  SignupPage, 
  HomePage, 
  ClubsPage, 
  ClubDetailsPage, 
  EventsPage, 
  ProfilePage 
} from '../utils/page-objects';

// Define worker-scoped fixture types
interface WorkerFixtures {
  apiHelper: APIHelper;
  testDataManager: TestDataManager;
}

// Define test-scoped fixture types
interface TestFixtures {
  // Page objects
  loginPage: LoginPage;
  signupPage: SignupPage;
  homePage: HomePage;
  clubsPage: ClubsPage;
  clubDetailsPage: ClubDetailsPage;
  eventsPage: EventsPage;
  profilePage: ProfilePage;
  
  // Authenticated context
  authenticatedPage: Page;
  adminPage: Page;
}

// Extend the base test with our fixtures
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // API Helper fixture (worker-scoped) – shared across tests in a worker
  apiHelper: [async ({}, use) => {
    const apiHelper = new APIHelper();
    await use(apiHelper);
    await apiHelper.cleanup();
  }, { scope: 'worker' }],

  // Test Data Manager fixture (worker-scoped) – read seeded data from global setup
  testDataManager: [async ({ apiHelper }, use) => {
    const testDataManager = new TestDataManager(apiHelper);
    // Load deterministically from artifacts written by global-setup
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const data = require('../artifacts/seed.json');
      (testDataManager as any).testUsers = data.users || [];
      const clubs = (data.clubs || []).map((c: any) => ({ ...c, id: c.id || c._id }));
      (testDataManager as any).testClubs = clubs;
      (testDataManager as any).testEvents = data.events || [];
      if (process.env.E2E_VERBOSE === '1') {
        console.log('🔄 Loaded seeded data from tests/e2e/artifacts/seed.json');
      }
    } catch (e2) {
      if (process.env.E2E_VERBOSE === '1') {
        console.warn('⚠️ Could not load seeded data, falling back to on-the-fly seeding');
      }
      await testDataManager.setupTestData();
    }
    await use(testDataManager);
  }, { scope: 'worker' }],

  // Page Object fixtures
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  clubsPage: async ({ page }, use) => {
    await use(new ClubsPage(page));
  },

  clubDetailsPage: async ({ page }, use) => {
    await use(new ClubDetailsPage(page));
  },

  eventsPage: async ({ page }, use) => {
    await use(new EventsPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  // Authenticated page fixture - logs in as regular user
  authenticatedPage: async ({ browser, apiHelper, testDataManager }, use) => {
    const context = await browser.newContext({ baseURL: process.env.BASE_URL || 'http://localhost:3000' });
    const page = await context.newPage();
    
    try {
      // Use the regular user created by TestDataManager
      const regular = testDataManager.getRegularUser();
      if (!regular?.tokens) {
        throw new Error('Regular test user tokens not available');
      }
      const tokens = regular.tokens;
      
      // Set authentication tokens in browser storage
      await page.goto('/');
      await page.evaluate((authTokens) => {
        localStorage.setItem('club_management_token', authTokens.accessToken);
        if ((authTokens as any).refreshToken) {
          localStorage.setItem('club_management_refresh_token', (authTokens as any).refreshToken);
        }
        localStorage.setItem('club_management_user', JSON.stringify(authTokens.user));
      }, tokens);
      
      await use(page);
    } finally {
      await context.close().catch(() => {});
    }
  },

  // Admin page fixture - logs in as admin user
  adminPage: async ({ browser, apiHelper, testDataManager }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Use the admin user created by TestDataManager
      const admin = testDataManager.getAdminUser();
      if (!admin?.tokens) {
        throw new Error('Admin test user tokens not available');
      }
      const tokens = admin.tokens;
      
      // Set authentication tokens in browser storage
      await page.goto('/');
      await page.evaluate((authTokens) => {
        localStorage.setItem('club_management_token', authTokens.accessToken);
        if ((authTokens as any).refreshToken) {
          localStorage.setItem('club_management_refresh_token', (authTokens as any).refreshToken);
        }
        localStorage.setItem('club_management_user', JSON.stringify(authTokens.user));
      }, tokens);
      
      await use(page);
    } finally {
      await context.close().catch(() => {});
    }
  },
});

export { expect } from '@playwright/test';
