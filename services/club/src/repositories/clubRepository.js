import { getDatabase } from '../config/database.js';

export async function getClubById(clubId) {
  try {
    const db = await getDatabase();
    const club = await db.collection('clubs').findOne({ id: clubId });
    return club;
  } catch (error) {
    console.error('Error getting club by ID:', error);
    throw error;
  }
}

export async function getClubEvents(clubId, filters) {
  try {
    const db = await getDatabase();
    
    // Build query
    let query = { club_id: clubId };
    
    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }
    
    // Apply date range filter
    if (filters.startFrom || filters.startTo) {
      query.start_at = {};
      if (filters.startFrom) {
        query.start_at.$gte = new Date(filters.startFrom);
      }
      if (filters.startTo) {
        query.start_at.$lte = new Date(filters.startTo + 'T23:59:59Z');
      }
    }
    
    // Get total count
    const total = await db.collection('events').countDocuments(query);
    
    // Apply pagination and get results
    const events = await db.collection('events')
      .find(query)
      .sort({ start_at: 1 })
      .skip(filters.offset)
      .limit(filters.limit)
      .project({
        _id: 0,
        id: 1,
        title: 1,
        start_at: 1,
        status: 1
      })
      .toArray();
    
    return {
      total,
      results: events
    };
  } catch (error) {
    console.error('Error getting club events:', error);
    throw error;
  }
}
