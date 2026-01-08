import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { APIHelper } from './utils/api-helper';
import { TestDataManager } from './utils/test-data-manager';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Global Setup...');
  
  // In CI (Jenkins), services run in Docker containers on Docker network
  // Tests must use Docker service names instead of localhost
  // In local development, services expose ports to host, so use localhost
  const isCI = process.env.CI === 'true';
  const host = isCI ? '' : 'localhost:';  // In CI: use service names, Local: use localhost:port
  
  console.log(`🌍 Environment: ${isCI ? 'CI' : 'Local'}`);
  console.log(`🔗 Using host: ${isCI ? 'Docker service names' : 'localhost'}`);
  
  // Service URLs
  const frontendUrl = isCI ? 'http://frontend:3000/api/health' : 'http://localhost:3000/api/health';
  const authUrl = isCI ? 'http://auth-service:3001/' : 'http://localhost:3001/';
  const clubUrl = isCI ? 'http://club-service:3002/health' : 'http://localhost:3002/health';
  const eventUrl = isCI ? 'http://event-service:3003/health' : 'http://localhost:3003/health';
  
  // Wait for services to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Generate a run id available to fixtures to align emails
    (global as any).__E2E_RUN_ID__ = `+e2e${Date.now()}`;
    // Wait for frontend to be accessible
    console.log('⏳ Waiting for frontend to be ready...');
    const apiHelper = new APIHelper();
    await apiHelper.waitForDirectService('frontend', frontendUrl, 60000);
    console.log('✅ Frontend is ready');

    // Check if API Gateway is ready
    console.log('⏳ Checking API Gateway health...');
    await apiHelper.waitForAPIGateway();
    console.log('✅ API Gateway is ready');

    // Check individual services directly (allow more time on cold starts)
    console.log('⏳ Checking microservices health...');
    await apiHelper.waitForDirectService('auth', authUrl, 60000);
    await apiHelper.waitForDirectService('club', clubUrl, 60000);
    await apiHelper.waitForDirectService('event', eventUrl, 60000);
    console.log('✅ All microservices are ready');

    // Sanity-check gateway service routes (ensures Kong loaded declarative config)
    try {
      await apiHelper.waitForService('auth', '/api/auth/health', 60000);
      await apiHelper.waitForService('club', '/api/clubs/health', 60000);
      await apiHelper.waitForService('event', '/health', 60000);
    } catch (e) {
      console.error('❌ API Gateway route check failed:', e);
      throw e;
    }

    // Setup test data once and persist to disk for all tests to consume
    console.log('⏳ Setting up test data...');
    const testDataManager = new TestDataManager(apiHelper);
    await testDataManager.setupTestData();
    const seeded = {
      users: testDataManager.getTestUsers(),
      clubs: testDataManager.getTestClubs(),
      events: testDataManager.getTestEvents(),
    };
    const outDir = path.resolve(__dirname, './artifacts');
    fs.mkdirSync(outDir, { recursive: true });
    const seedPath = path.join(outDir, 'seed.json');
    fs.writeFileSync(seedPath, JSON.stringify(seeded, null, 2));
    // Also write a copy at repository root `artifacts/seed.json` for consumers expecting the root path
    const rootArtifactsDir = path.resolve(__dirname, '../..', 'artifacts');
    fs.mkdirSync(rootArtifactsDir, { recursive: true });
    fs.writeFileSync(path.join(rootArtifactsDir, 'seed.json'), JSON.stringify(seeded, null, 2));
    console.log('✅ Test data setup complete and saved to artifacts/seed.json');

    console.log('🎉 E2E Global Setup Complete!');
    
  } catch (error) {
    console.error('❌ Global Setup Failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
