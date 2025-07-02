import { connectToDatabase } from './src/config/database.js';
import { initializeDatabase } from './src/config/initDatabase.js';
import { GetClubEventsDTO } from './src/dtos/clubEventDto.js';
import { getClubEventsService } from './src/services/clubService.js';

// Test the US-006 endpoint functionality with MongoDB
async function testMongoDBEvents() {
  try {
    console.log('Testing US-006: Filter/Search Events of Club with MongoDB');
    
    // Connect to database
    await connectToDatabase();
    await initializeDatabase();
    
    // Test case 1: Get all upcoming events for club-001
    try {
      const query1 = {
        status: 'upcoming',
        page: 1,
        limit: 10
      };
      
      const dto1 = new GetClubEventsDTO(query1, 'club-001');
      const result1 = await getClubEventsService('club-001', dto1);
      
      console.log('\nTest 1 - Upcoming events for Music Club:');
      console.log(JSON.stringify(result1, null, 2));
    } catch (error) {
      console.error('Test 1 failed:', error.message);
    }

    // Test case 2: Get events with date range filter
    try {
      const query2 = {
        start_from: '2025-06-01',
        start_to: '2025-07-01',
        page: 1,
        limit: 5
      };
      
      const dto2 = new GetClubEventsDTO(query2, 'club-001');
      const result2 = await getClubEventsService('club-001', dto2);
      
      console.log('\nTest 2 - Events in date range for Music Club:');
      console.log(JSON.stringify(result2, null, 2));
    } catch (error) {
      console.error('Test 2 failed:', error.message);
    }

    // Test case 3: Non-existent club
    try {
      const query3 = { page: 1, limit: 10 };
      const dto3 = new GetClubEventsDTO(query3, 'non-existent-club');
      const result3 = await getClubEventsService('non-existent-club', dto3);
      
      console.log('\nTest 3 - Non-existent club:');
      console.log(JSON.stringify(result3, null, 2));
    } catch (error) {
      console.log('\nTest 3 - Expected error for non-existent club:');
      console.log('Error:', error.message);
      console.log('Error type:', error.name);
      console.log('Error code:', error.error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMongoDBEvents(); 