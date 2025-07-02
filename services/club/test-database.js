import { connectToDatabase, closeConnection } from './src/config/database.js';

async function testDatabase() {
  try {
    console.log('🧪 Testing Database Connection and Queries...');
    
    const { db } = await connectToDatabase();
    
    // Test 1: Count clubs
    const clubCount = await db.collection('clubs').countDocuments();
    console.log(`✅ Found ${clubCount} clubs in database`);
    
    // Test 2: Count events
    const eventCount = await db.collection('events').countDocuments();
    console.log(`✅ Found ${eventCount} events in database`);
    
    // Test 3: Get club by ID
    const club = await db.collection('clubs').findOne({ id: 'club-001' });
    console.log(`✅ Club found: ${club.name}`);
    
    // Test 4: Get events for club-001
    const events = await db.collection('events')
      .find({ club_id: 'club-001' })
      .toArray();
    console.log(`✅ Found ${events.length} events for club-001`);
    
    // Test 5: Test filtering by status
    const upcomingEvents = await db.collection('events')
      .find({ club_id: 'club-001', status: 'upcoming' })
      .toArray();
    console.log(`✅ Found ${upcomingEvents.length} upcoming events for club-001`);
    
    // Test 6: Test date filtering
    const dateFilteredEvents = await db.collection('events')
      .find({
        club_id: 'club-001',
        start_at: {
          $gte: new Date('2025-06-01'),
          $lte: new Date('2025-07-01T23:59:59Z')
        }
      })
      .toArray();
    console.log(`✅ Found ${dateFilteredEvents.length} events in date range for club-001`);
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await closeConnection();
  }
}

testDatabase(); 