const request = require('supertest');
const Application = require('../src/app');

let app;

beforeAll(async () => {
  // Set up test environment
  process.env.API_GATEWAY_SECRET = process.env.API_GATEWAY_SECRET || 'test-secret';
  
  // Application.initialize() tests DB connection; we will not call it for health
  const application = new Application();
  app = application.getApp();
  
  // Sync database schema for tests
  const { sequelize } = require('../src/models');
  await sequelize.sync({ force: true });
});

describe('Auth service health endpoints', () => {
  test('GET / responds without auth', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body?.service).toBe('auth-service');
  });

  test('GET /api/auth/liveness requires gateway secret and returns 200', async () => {
    const res401 = await request(app).get('/api/auth/liveness');
    expect(res401.status).toBe(401);

    const res = await request(app)
      .get('/api/auth/liveness')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET || 'test-secret');
    expect(res.status).toBe(200);
  });
});
