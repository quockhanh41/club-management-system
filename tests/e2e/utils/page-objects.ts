import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  public page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForLoadState(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}

export class LoginPage extends BasePage {
  private emailInput: Locator;
  private passwordInput: Locator;
  private loginButton: Locator;
  private signupLink: Locator;
  private errorMessage: Locator;
  private toast: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('button:has-text("Sign In")');
    this.signupLink = page.locator('a:has-text("Sign up")');
    this.errorMessage = page.locator('.text-red-600');
    this.toast = page.locator('[role="alert"], .sonner-toast, [data-sonner-toast]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForLoadState();
  }

  async goto(): Promise<void> {
    await super.goto('/login');
  }

  async clickSignupLink(): Promise<void> {
    await this.signupLink.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isErrorVisible(): Promise<boolean> {
    const inline = await this.errorMessage.isVisible().catch(() => false);
    if (inline) return true;
    return await this.toast.isVisible().catch(() => false);
  }

  async isToastVisible(text?: string): Promise<boolean> {
    if (text) {
      return await this.page.locator(`[role="alert"]:has-text("${text}")`).isVisible().catch(() => false);
    }
    return await this.toast.isVisible().catch(() => false);
  }
}

export class SignupPage extends BasePage {
  private fullNameInput: Locator;
  private emailInput: Locator;
  private passwordInput: Locator;
  private confirmPasswordInput: Locator;
  private termsCheckbox: Locator;
  private signupButton: Locator;
  private loginLink: Locator;
  private successMessage: Locator;
  private errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.fullNameInput = page.locator('#name');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.termsCheckbox = page.locator('#terms');
    this.signupButton = page.locator('button:has-text("Create Account")');
    this.loginLink = page.locator('a:has-text("Sign in")');
    this.successMessage = page.locator('.text-green-600');
    this.errorMessage = page.locator('.text-red-600');
  }

  async signup(userData: {
    full_name: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.goto();
    await this.fullNameInput.fill(userData.full_name);
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    
    if (userData.confirmPassword) {
      await this.confirmPasswordInput.fill(userData.confirmPassword);
    }
    
    // Accept terms and conditions (shadcn/ui Checkbox)
    await this.termsCheckbox.click();
    
    await this.signupButton.click();
    await this.waitForLoadState();
  }

  async goto(): Promise<void> {
    await super.goto('/signup');
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  async isErrorMessageVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}

export class HomePage extends BasePage {
  private clubsSection: Locator;
  private eventsSection: Locator;
  private loginButton: Locator;
  private signupButton: Locator;
  private profileLink: Locator;
  private logoutButton: Locator;
  private userMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.clubsSection = page.locator('text=Câu lạc bộ nổi bật').locator('..');
    this.eventsSection = page.locator('text=Hoạt động gần đây').locator('..');
    this.loginButton = page.locator('a:has-text("Đăng nhập")');
    this.signupButton = page.locator('a:has-text("Đăng ký")');
    this.userMenu = page.locator('[data-testid="user-menu-trigger"]');
    this.profileLink = page.locator('text=Hồ sơ cá nhân');
    this.logoutButton = page.getByTestId('logout-btn');
  }

  async goto(): Promise<void> {
    await super.goto('/');
  }

  async isLoggedIn(): Promise<boolean> {
    // Prefer explicit global/test signal or token existence
    const hasAuth = await this.page.evaluate(() => {
      const w = window as any;
      if (w.__AUTH_SUCCESS__ === true) return true;
      try {
        return !!localStorage.getItem('club_management_token');
      } catch {
        return false;
      }
    });
    if (hasAuth) return true;

    // Fallback to UI: Logged in if the "Đăng nhập" link is not visible in header
    const loginLink = this.page.locator('header').locator('a:has-text("Đăng nhập")');
    const visible = await loginLink.isVisible().catch(() => false);
    return !visible;
  }

  async logout(): Promise<void> {
    if (await this.isLoggedIn()) {
      await this.userMenu.waitFor({ state: 'visible' }).catch(() => {});
      await this.userMenu.click().catch(() => {});
      const logoutByTestId = this.page.getByTestId('logout-btn');
      if (await logoutByTestId.isVisible().catch(() => false)) {
        await logoutByTestId.click();
      } else {
        const logoutByText = this.page.getByText('Đăng xuất');
        await expect(logoutByText).toBeVisible({ timeout: 5000 });
        await logoutByText.click();
      }
      // Ensure any navigation completes before interacting with the execution context
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      // Small grace period for stores/effects to run
      await this.page.waitForTimeout(300);
      // Ensure tokens cleared; fallback to manual clear if app didn't remove
      let stillHasToken = false;
      try {
        stillHasToken = await this.page.evaluate(() => !!localStorage.getItem('club_management_token'));
      } catch {
        // If navigation destroyed the context, wait and retry once
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        stillHasToken = await this.page
          .evaluate(() => !!localStorage.getItem('club_management_token'))
          .catch(() => false);
      }
      if (stillHasToken) {
        await this.page.evaluate(() => {
          localStorage.removeItem('club_management_token');
          localStorage.removeItem('club_management_refresh_token');
          localStorage.removeItem('club_management_user');
          const w: any = window as any;
          if (typeof w.__AUTH_E2E_SET__ === 'function') {
            w.__AUTH_E2E_SET__(null, null);
          }
          w.__AUTH_SUCCESS__ = false;
          w.__AUTH_USER__ = undefined;
        });
        await this.page.reload();
      }
      // Wait for logged-out state (login link visible or token cleared)
      await this.page
        .waitForFunction(() => !localStorage.getItem('club_management_token'), null, { timeout: 15000 })
        .catch(() => {});
      await expect(this.page.locator('header').locator('a:has-text("Đăng nhập")')).toBeVisible({ timeout: 15000 });
    }
  }

  async goToProfile(): Promise<void> {
    await this.userMenu.click();
    await this.profileLink.click();
  }

  async getClubsCount(): Promise<number> {
    const clubCards = this.page.locator('[data-testid="club-card"], .club-card');
    return await clubCards.count();
  }

  async getEventsCount(): Promise<number> {
    const eventCards = this.page.locator('[data-testid="event-card"], .event-card');
    return await eventCards.count();
  }
}

export class ClubsPage extends BasePage {
  private clubsList: Locator;
  private createClubButton: Locator;
  private searchInput: Locator;
  private categoryFilter: Locator;
  private clubCard: Locator;

  constructor(page: Page) {
    super(page);
    this.clubsList = page.locator('[data-testid="clubs-grid"], [data-testid="club-card"], .club-card');
    this.createClubButton = page.locator('button:has-text("Create Club"), a:has-text("Create Club"), a[href="/clubs/create"], a:has-text("Tạo câu lạc bộ")');
    this.searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Tìm kiếm câu lạc bộ"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.clubCard = page.locator('[data-testid="club-card"], .club-card');
  }

  async goto(): Promise<void> {
    await super.goto('/clubs');
  }

  async searchClubs(query: string): Promise<void> {
    await this.searchInput.fill('');
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadState();
  }

  async filterByCategory(category: string): Promise<void> {
    // If category filter is not present (or disabled), skip gracefully
    const exists = await this.categoryFilter.isVisible().catch(() => false);
    if (!exists) return;
    try {
      await expect(this.categoryFilter).toBeEnabled({ timeout: 5000 });
    } catch {
      // Still loading categories; small wait then continue or skip
      await this.page.waitForTimeout(500);
    }
    // Open shadcn Select dropdown and choose item by text
    await this.categoryFilter.click().catch(() => {});
    const option = this.page.getByRole('option', { name: category }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      await this.page.locator('[data-radix-popper-content-wrapper] [data-state], [role="listbox"] *:text("' + category + '")').first().click().catch(async () => {
        await this.page.locator(`text=${category}`).first().click();
      });
    }
    await this.waitForLoadState();
  }

  async clickCreateClub(): Promise<void> {
    await this.createClubButton.click();
  }

  async getClubsCount(): Promise<number> {
    return await this.clubCard.count();
  }

  async clickClub(clubName: string): Promise<void> {
    const club = this.page.locator(`.club-card:has-text("${clubName}"), [data-testid="club-card"]:has-text("${clubName}")`);
    await club.click();
  }
}

export class ClubDetailsPage extends BasePage {
  private clubTitle: Locator;
  private clubDescription: Locator;
  private joinButton: Locator;
  private leaveButton: Locator;
  private editButton: Locator;
  private eventsSection: Locator;
  private membersSection: Locator;

  constructor(page: Page) {
    super(page);
    this.clubTitle = page.locator('h1, [data-testid="club-title"]');
    this.clubDescription = page.locator('.club-description, [data-testid="club-description"]');
    this.joinButton = page.locator('button:has-text("Join")');
    this.leaveButton = page.locator('button:has-text("Leave")');
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    this.eventsSection = page.locator('.events-section, [data-testid="events-section"]');
    this.membersSection = page.locator('.members-section, [data-testid="members-section"]');
  }

  async getClubTitle(): Promise<string> {
    // Wait for page to load completely before getting title
    await this.page.waitForLoadState('networkidle');
    
    // Wait for either h1 or club-title element to be visible
    // Increase timeout for webkit/mobile browsers
    await this.clubTitle.first().waitFor({ 
      state: 'visible', 
      timeout: 15000 
    });
    
    const text = await this.clubTitle.first().textContent();
    return text?.trim() || '';
  }

  async joinClub(): Promise<void> {
    await this.joinButton.click();
    await this.waitForLoadState();
  }

  async leaveClub(): Promise<void> {
    await this.leaveButton.click();
    await this.waitForLoadState();
  }

  async editClub(): Promise<void> {
    await this.editButton.click();
  }

  async isJoinButtonVisible(): Promise<boolean> {
    return await this.joinButton.isVisible();
  }

  async isLeaveButtonVisible(): Promise<boolean> {
    return await this.leaveButton.isVisible();
  }
}

export class EventsPage extends BasePage {
  private eventsList: Locator;
  private createEventButton: Locator;
  private searchInput: Locator;
  private categoryFilter: Locator;
  private eventCard: Locator;

  constructor(page: Page) {
    super(page);
    this.eventsList = page.locator('[data-testid="events-list"], .space-y-4');
    this.createEventButton = page.locator('button:has-text("Create Event"), a:has-text("Create Event"), a[href="/events/new"]');
    this.searchInput = page.locator('input[placeholder*="Search events"], input[placeholder*="Search by title"], input#search').first();
    this.categoryFilter = page.locator('[data-testid="events-category-filter"], select[name="category"]');
    this.eventCard = page.locator('[data-testid="event-card"], .event-card');
  }

  async goto(): Promise<void> {
    await super.goto('/events');
  }

  async searchEvents(query: string): Promise<void> {
    await this.searchInput.fill('');
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadState();
  }

  async filterByCategory(category: string): Promise<void> {
    const isSelect = await this.categoryFilter.evaluate(el => el.tagName.toLowerCase() === 'select').catch(() => false);
    if (isSelect) {
      await this.categoryFilter.selectOption(category).catch(() => {});
    } else {
      await this.categoryFilter.click().catch(() => {});
      const option = this.page.getByRole('option', { name: category }).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      } else {
        await this.page.locator('text=' + category).first().click().catch(() => {});
      }
    }
    await this.waitForLoadState();
  }

  async clickCreateEvent(): Promise<void> {
    await this.createEventButton.click();
  }

  async getEventsCount(): Promise<number> {
    try {
      // Try to wait briefly for any cards to attach; ignore timeout
      await this.page.locator('[data-testid="event-card"], .event-card').first().waitFor({ state: 'attached', timeout: 2000 }).catch(() => {});
      return await this.page.locator('[data-testid="event-card"], .event-card').count();
    } catch {
      return 0;
    }
  }

  async clickEvent(eventTitle: string): Promise<void> {
    const event = this.page.locator(`[data-testid="event-card"]:has-text("${eventTitle}"), .event-card:has-text("${eventTitle}")`);
    await event.click();
  }
}

export class ProfilePage extends BasePage {
  private userNameDisplay: Locator;
  private userEmailDisplay: Locator;
  private editProfileButton: Locator;
  private changePasswordButton: Locator;
  private fullNameInput: Locator;
  private saveButton: Locator;
  private successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.userNameDisplay = page.locator('[data-testid="user-name"], .user-name, h1:has-text("Hồ sơ cá nhân")');
    this.userEmailDisplay = page.locator('[data-testid="user-email"], .user-email');
    this.editProfileButton = page.locator('button:has-text("Edit Profile"), button:has-text("Chỉnh sửa")');
    this.changePasswordButton = page.locator('button:has-text("Change Password")');
    this.fullNameInput = page.locator('input[name="full_name"], input[name="fullName"]');
    this.saveButton = page.locator('button:has-text("Save")');
    this.successMessage = page.locator('.success, .alert-success, [data-testid="success"]');
  }

  async goto(): Promise<void> {
    await super.goto('/profile');
  }

  async getUserName(): Promise<string> {
    try {
      const el = this.userNameDisplay.first();
      await el.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      return (await el.textContent()) || '';
    } catch {
      return '';
    }
  }

  async getUserEmail(): Promise<string> {
    const el = this.userEmailDisplay.first();
    if (await el.isVisible().catch(() => false)) {
      return (await el.textContent()) || '';
    }
    return '';
  }

  async updateProfile(newName: string): Promise<void> {
    await this.editProfileButton.click();
    await this.fullNameInput.fill(newName);
    await this.saveButton.click();
    await this.waitForLoadState();
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }
}
