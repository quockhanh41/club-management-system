const request = require('supertest');
const Application = require('../src/app');

let app;

beforeAll(async () => {
  // Set up test environment
  process.env.API_GATEWAY_SECRET = process.env.API_GATEWAY_SECRET || 'test-secret';
  
  // Create application without full database initialization
  const application = new Application();
  app = application.getApp();
  
  // Sync database schema for tests
  const { sequelize } = require('../src/models');
  await sequelize.sync({ force: true });
});

describe('Auth Service - Route Validation and Middleware', () => {
  test('POST /api/auth/register should require gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        full_name: 'Test User'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('POST /api/auth/register should validate request body with gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET)
      .send({
        email: 'invalid-email',
        password: '123', // too short
        // missing full_name
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Validation');
  });

  test('POST /api/auth/login should require gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('POST /api/auth/login should validate request body with gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET)
      .send({
        email: 'invalid-email-format',
        password: '' // empty password
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Validation');
  });

  test('POST /api/auth/refresh should require gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('POST /api/auth/refresh should require refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Refresh token');
  });

  test('POST /api/auth/verify-email should require gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        token: 'some-token'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('POST /api/auth/verify-email should validate token format', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET)
      .send({
        token: '' // empty token
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Validation');
  });

  test('POST /api/auth/forgot-password should require gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        email: 'test@example.com'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('POST /api/auth/forgot-password should validate email format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET)
      .send({
        email: 'invalid-email-format'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Validation');
  });

  test('POST /api/auth/logout should require gateway secret', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('GET /api/auth/profile should require gateway secret', async () => {
    const res = await request(app)
      .get('/api/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('GET /api/auth/profile should require user headers', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
      // Missing user headers

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('authentication headers');
  });

  test('PUT /api/auth/profile should require gateway secret and headers', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({
        full_name: 'Updated Name'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('POST /api/auth/change-password should require gateway secret and headers', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({
        current_password: 'old',
        new_password: 'new',
        confirm_password: 'new'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized: Request must come through API Gateway');
  });

  test('DELETE /api/auth/account should return 404 (route not implemented)', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .send({
        password: 'password'
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Cannot find');
  });
});
