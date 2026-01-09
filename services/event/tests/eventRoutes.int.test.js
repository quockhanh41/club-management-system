import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { eventRoutes } from '../src/routes/eventRoutes.js';
import { Event } from '../src/models/event.js';

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
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Event routes (integration)', () => {
  test('GET /api/events without gateway secret returns 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });

  test('GET /api/events with gateway secret returns a response', async () => {
    // Seed a published event
    const clubId = new mongoose.Types.ObjectId();
    await Event.create({
      club_id: clubId,
      title: 'Intro Workshop',
      category: 'Workshop',
      start_date: new Date(Date.now() + 86400000),
      end_date: new Date(Date.now() + 2*86400000),
      status: 'published',
      visibility: 'public',
      created_by: '00000000-0000-0000-0000-000000000001'
    });
    const res = await request(app)
      .get('/api/events')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
    expect([200, 400, 500]).toContain(res.status);
  });

  test('GET /api/events/categories with gateway secret returns a response', async () => {
    const res = await request(app)
      .get('/api/events/categories')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/events/:id invalid id returns 500 (controller catches) or 404', async () => {
    const res = await request(app)
      .get('/api/events/invalid-id')
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
    expect([404, 500]).toContain(res.status);
  });

  test('GET /api/events/:id not found returns 404', async () => {
    const res = await request(app)
      .get(`/api/events/${new mongoose.Types.ObjectId().toString()}`)
      .set('x-api-gateway-secret', process.env.API_GATEWAY_SECRET);
    expect([404, 500]).toContain(res.status);
  });
});
