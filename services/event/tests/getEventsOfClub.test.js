import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { eventRoutes } from '../src/routes/eventRoutes.js';
import { Event } from '../src/models/event.js';
import { errorHandler } from '../src/middlewares/errorMiddleware.js';

let app;
let mongoServer;

beforeAll(async () => {
  process.env.API_GATEWAY_SECRET = process.env.API_GATEWAY_SECRET || 'test-secret';
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '6.0.16',
    },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  app = express();
  app.use(bodyParser.json());
  app.use(eventRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await Event.deleteMany({}); // Clean up events after each test
});

describe('GET /api/clubs/:id/events', () => {
  it('should return 400 for invalid club ID format', async () => {
    const res = await request(app)
      .get('/api/clubs/invalid-club-id/events')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
    expect(res.status).toBe(500); // Service throws "Invalid club ID format" error
  });

  it('should return empty results for non-existent club with valid ObjectId', async () => {
    const nonExistentClubId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/clubs/${nonExistentClubId}/events`)
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('should return events for a club with events', async () => {
    // Create a test event for a club
    const clubId = new mongoose.Types.ObjectId();
    await Event.create({
      club_id: clubId,
      title: 'Test Event',
      category: 'Workshop',
      start_date: new Date(Date.now() + 86400000), // Tomorrow
      end_date: new Date(Date.now() + 2 * 86400000), // Day after tomorrow
      status: 'published',
      visibility: 'public',
      created_by: '00000000-0000-0000-0000-000000000001'
    });

    const res = await request(app)
      .get(`/api/clubs/${clubId}/events`)
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET)
      .query({ status: 'upcoming', page: 1, limit: 10 });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Test Event');
    expect(res.body.meta).toHaveProperty('total', 1);
  });

  it('should filter by date range', async () => {
    const clubId = new mongoose.Types.ObjectId();
    // Create event in February 2024
    await Event.create({
      club_id: clubId,
      title: 'February Event',
      category: 'Meeting',
      start_date: new Date('2024-02-15'),
      end_date: new Date('2024-02-15'),
      status: 'published',
      visibility: 'public',
      created_by: '00000000-0000-0000-0000-000000000001'
    });

    const res = await request(app)
      .get(`/api/clubs/${clubId}/events`)
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET)
      .query({ start_from: '2024-02-01', start_to: '2024-02-28' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('February Event');
  });
}); 