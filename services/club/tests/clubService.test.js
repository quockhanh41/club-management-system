const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const clubService = require('../src/services/clubService');

// Mock database models to use the real mongoose models from club config
jest.mock('../src/config/database', () => {
  const actual = jest.requireActual('../src/config/database');
  return actual;
});

// Mock external service clients used by ClubService
jest.mock('../src/utils/authServiceClient', () => ({
  verifyUserExists: jest.fn(async (userId) => ({
    data: { user: { id: userId, email: 'manager@example.com', full_name: 'Manager User' } }
  }))
}));

jest.mock('../src/utils/eventServiceClient', () => ({
  getPublishedClubEvents: jest.fn(async () => []),
  getCompletedClubEvents: jest.fn(async () => []),
  getEventStatistics: jest.fn(async () => ({
    total_events: 0, published_events: 0, completed_events: 0, upcoming_events: 0
  }))
}));

let mongoServer;

beforeAll(async () => {
  // Force using Ubuntu 22.04 binaries as Debian 12/13 ARM64 support in fastdl is spotty
  process.env.MONGOMS_DISTRO = 'ubuntu-22.04';
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.3',
    },
  });
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  // Load DB module after setting env
  require('../src/config/database');
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  // Cleanup all collections
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

describe('ClubService - create and fetch', () => {
  test('createClub validates required fields', async () => {
    await expect(clubService.createClub({}, { userId: 'u1' }))
      .rejects.toHaveProperty('status', 400);
  });

  test('createClub creates a club with manager and returns data', async () => {
    const payload = {
      name: 'Chess Club',
      category: 'Cộng đồng',
      manager_user_id: '00000000-0000-0000-0000-000000000001',
      manager_full_name: 'Alice',
      manager_email: 'alice@example.com',
      description: 'All about chess',
      location: 'Campus'
    };

    const userContext = { userId: '00000000-0000-0000-0000-000000000099', userRole: 'admin' };

    const result = await clubService.createClub(payload, userContext);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ name: 'Chess Club', category: 'Cộng đồng' });
    expect(result.data.manager).toBeDefined();
  });

  test('getClubs returns pagination and results', async () => {
    // Seed one club
    await clubService.createClub({
      name: 'Robotics',
      category: 'Công nghệ',
      manager_user_id: '00000000-0000-0000-0000-000000000002',
      manager_full_name: 'Bob',
      manager_email: 'bob@example.com'
    }, { userId: '00000000-0000-0000-0000-000000000099', userRole: 'admin' });

    const list = await clubService.getClubs({ page: '1', limit: '10', sort: 'name' });
    expect(list.success).toBe(true);
    expect(list.data.results.length).toBeGreaterThanOrEqual(1);
    expect(list.pagination).toHaveProperty('total_pages');
  });
});
