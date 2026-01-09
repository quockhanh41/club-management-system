import { APIHelper, AuthTokens } from './api-helper';

export interface TestUser {
  email: string;
  password: string;
  full_name: string;
  tokens?: AuthTokens;
}

export interface TestClub {
  id?: string;
  name: string;
  description: string;
  category: string;
  contact_email: string;
  created_by?: string;
  manager_full_name: string;
  manager_user_id: string;
  manager_email: string;
}

export interface TestEvent {
  id?: string;
  club_id: string;
  title: string;
  description: string;
  category: string;
  start_date: string;
  end_date: string;
  location: string;
  max_participants?: number;
  status?: string;
  visibility?: string;
  detailed_location?: string;
}

export class TestDataManager {
  private apiHelper: APIHelper;
  private testUsers: TestUser[] = [];
  private testClubs: TestClub[] = [];
  private testEvents: TestEvent[] = [];

  constructor(apiHelper: APIHelper) {
    this.apiHelper = apiHelper;
  }

  async setupTestData(): Promise<void> {
    console.log('Setting up test users...');
    await this.createTestUsers();
    
    console.log('Setting up test clubs...');
    await this.createTestClubs();
    
    console.log('Setting up test events...');
    await this.createTestEvents();
  }

  private async createTestUsers(): Promise<void> {
    // Make emails unique per run to avoid collisions with previous runs
    const runId = Date.now();
    const uniq = (email: string) => email.replace('@', `+e2e${runId}@`);

    const users: TestUser[] = [
      {
        email: uniq('admin@test.com'),
        password: 'AdminPassword123!',
        full_name: 'Test Admin User',
      },
      {
        email: uniq('user1@test.com'),
        password: 'UserPassword123!',
        full_name: 'Test User One',
      },
      {
        email: uniq('user2@test.com'),
        password: 'UserPassword123!',
        full_name: 'Test User Two',
      },
      {
        email: uniq('clubmanager@test.com'),
        password: 'ManagerPassword123!',
        full_name: 'Club Manager User',
      },
    ];

    for (const user of users) {
      try {
        // Register user
        await this.apiHelper.registerUser(user);
        
        // Login to get tokens
        const tokens = await this.apiHelper.loginUser({
          email: user.email,
          password: user.password,
        });
        
        user.tokens = tokens;
        this.testUsers.push(user);
        
        console.log(`✅ Created test user: ${user.email}`);
      } catch (error) {
        console.warn(`⚠️  Failed to create user ${user.email}:`, error);
        // Continue with other users
      }
    }
  }

  private async createTestClubs(): Promise<void> {
    const adminUser = this.testUsers.find(u => u.full_name === 'Test Admin User');
    
    if (!adminUser?.tokens) {
      if (process.env.E2E_VERBOSE === '1') {
        console.warn('⚠️  Admin user not available, skipping club creation');
      }
      return;
    }

    const runId = Date.now();
    const suffix = ` ${runId}`;
    const clubs: TestClub[] = [
      {
        name: `E2E Test Tech Club${suffix}`,
        description: 'A technology club for E2E testing',
        category: 'Công nghệ',
        contact_email: 'tech@test.com',
        manager_user_id: adminUser.tokens!.user.id,
        manager_full_name: adminUser.tokens!.user.full_name,
        manager_email: adminUser.tokens!.user.email,
      },
      {
        name: `E2E Test Sports Club${suffix}`,
        description: 'A sports club for E2E testing',
        category: 'Thể thao',
        contact_email: 'sports@test.com',
        manager_user_id: adminUser.tokens!.user.id,
        manager_full_name: adminUser.tokens!.user.full_name,
        manager_email: adminUser.tokens!.user.email,
      },
      {
        name: `E2E Test Art Club${suffix}`,
        description: 'An art club for E2E testing',
        category: 'Nghệ thuật',
        contact_email: 'art@test.com',
        manager_user_id: adminUser.tokens!.user.id,
        manager_full_name: adminUser.tokens!.user.full_name,
        manager_email: adminUser.tokens!.user.email,
      },
    ];

    for (let i = 0; i < clubs.length; i++) {
      const club = clubs[i];
      const creator = adminUser;

      try {
        const createdClub = await this.apiHelper.createClub(club, creator.tokens!);
        club.id = createdClub._id;
        club.created_by = creator.tokens!.user.id;
        this.testClubs.push(club);
        
        console.log(`✅ Created test club: ${club.name}`);
      } catch (error) {
        console.warn(`⚠️  Failed to create club ${club.name}:`, error);
      }
    }
  }

  private async createTestEvents(): Promise<void> {
    const adminUser = this.testUsers.find(u => u.full_name === 'Test Admin User');
    
    if (!adminUser?.tokens || this.testClubs.length === 0) {
      if (process.env.E2E_VERBOSE === '1') {
        console.warn('⚠️  Admin user or clubs not available, skipping event creation');
      }
      return;
    }

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    const endDate = new Date(futureDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    for (const club of this.testClubs) {
      if (!club.id) continue;
      
      const events: TestEvent[] = [
        {
          club_id: club.id,
          title: `E2E Test Workshop - ${club.name}`,
          description: `A test workshop for ${club.name}`,
          category: 'Workshop',
          start_date: futureDate.toISOString(),
          end_date: endDate.toISOString(),
          location: 'Test Location',
          max_participants: 50,
          status: 'published',
          visibility: 'public',
          detailed_location: 'Main Hall',
        },
        {
          club_id: club.id,
          title: `E2E Test Meeting - ${club.name}`,
          description: `A test meeting for ${club.name}`,
          category: 'Meeting',
          start_date: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Meeting Room',
          max_participants: 30,
          status: 'published',
          visibility: 'public',
          detailed_location: 'Room A2',
        },
      ];

      for (const event of events) {
        try {
          const createdEvent = await this.apiHelper.createEvent(event, adminUser.tokens!);
          event.id = createdEvent._id;
          this.testEvents.push(event);
          
          console.log(`✅ Created test event: ${event.title}`);
        } catch (error) {
          console.warn(`⚠️  Failed to create event ${event.title}:`, error);
        }
      }
    }
  }

  async cleanupTestData(): Promise<void> {
    console.log('Cleaning up test events...');
    await this.cleanupTestEvents();
    
    console.log('Cleaning up test clubs...');
    await this.cleanupTestClubs();
    
    // Note: We don't cleanup test users as they might be needed for other tests
    // and user cleanup would require additional API endpoints
  }

  private async cleanupTestEvents(): Promise<void> {
    const adminUser = this.testUsers.find(u => u.full_name === 'Test Admin User');
    
    if (!adminUser?.tokens) {
      if (process.env.E2E_VERBOSE === '1') {
        console.warn('⚠️  Admin user not available, skipping event cleanup');
      }
      return;
    }

    for (const event of this.testEvents) {
      if (!event.id) continue;
      
      try {
        await this.apiHelper.deleteEvent(event.id, adminUser.tokens!);
        console.log(`✅ Cleaned up test event: ${event.title}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup event ${event.title}:`, error);
      }
    }
  }

  private async cleanupTestClubs(): Promise<void> {
    const adminUser = this.testUsers.find(u => u.full_name === 'Test Admin User');
    
    if (!adminUser?.tokens) {
      if (process.env.E2E_VERBOSE === '1') {
        console.warn('⚠️  Admin user not available, skipping club cleanup');
      }
      return;
    }

    for (const club of this.testClubs) {
      if (!club.id) continue;
      
      try {
        await this.apiHelper.deleteClub(club.id, adminUser.tokens!);
        console.log(`✅ Cleaned up test club: ${club.name}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup club ${club.name}:`, error);
      }
    }
  }

  // Getter methods for test data
  getTestUsers(): TestUser[] {
    return this.testUsers;
  }

  getTestClubs(): TestClub[] {
    return this.testClubs;
  }

  getTestEvents(): TestEvent[] {
    return this.testEvents;
  }

  getAdminUser(): TestUser | undefined {
    return this.testUsers.find(u => u.full_name === 'Test Admin User');
  }

  getRegularUser(): TestUser | undefined {
    return this.testUsers.find(u => u.full_name === 'Test User One');
  }

  getManagerUser(): TestUser | undefined {
    return this.testUsers.find(u => u.full_name === 'Club Manager User');
  }
}
