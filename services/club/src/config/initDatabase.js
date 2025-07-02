import { connectToDatabase } from './database.js';

export async function initializeDatabase() {
  try {
    const db = await connectToDatabase();
    
    // Tạo collection events nếu chưa tồn tại
    const eventsCollection = db.collection('events');
    
    // Tạo indexes cho tối ưu truy vấn
    await eventsCollection.createIndex({ club_id: 1, start_at: 1, status: 1 });
    await eventsCollection.createIndex({ club_id: 1, status: 1 });
    await eventsCollection.createIndex({ start_at: 1 });
    
    // Kiểm tra xem đã có dữ liệu chưa
    const eventCount = await eventsCollection.countDocuments();
    
    if (eventCount === 0) {
      // Thêm dữ liệu mẫu
      const sampleEvents = [
        {
          club_id: 'club-001',
          title: 'Summer Music Festival',
          description: 'Annual summer music festival',
          start_at: new Date('2025-06-20T18:00:00Z'),
          end_at: new Date('2025-06-20T22:00:00Z'),
          status: 'upcoming',
          location: 'Main Auditorium',
          max_participants: 200,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          club_id: 'club-001',
          title: 'Jazz Night',
          description: 'Relaxing jazz evening',
          start_at: new Date('2025-05-15T19:00:00Z'),
          end_at: new Date('2025-05-15T21:00:00Z'),
          status: 'upcoming',
          location: 'Music Room',
          max_participants: 50,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          club_id: 'club-002',
          title: 'Hackathon 2025',
          description: '24-hour coding challenge',
          start_at: new Date('2025-07-10T09:00:00Z'),
          end_at: new Date('2025-07-11T09:00:00Z'),
          status: 'upcoming',
          location: 'Computer Lab',
          max_participants: 100,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          club_id: 'club-002',
          title: 'AI Workshop',
          description: 'Introduction to Artificial Intelligence',
          start_at: new Date('2025-04-25T14:00:00Z'),
          end_at: new Date('2025-04-25T16:00:00Z'),
          status: 'completed',
          location: 'Lecture Hall A',
          max_participants: 80,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          club_id: 'club-003',
          title: 'Basketball Tournament',
          description: 'Inter-club basketball competition',
          start_at: new Date('2025-06-05T10:00:00Z'),
          end_at: new Date('2025-06-05T18:00:00Z'),
          status: 'upcoming',
          location: 'Sports Complex',
          max_participants: 150,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      await eventsCollection.insertMany(sampleEvents);
      console.log('Sample events data inserted successfully');
    } else {
      console.log('Events collection already has data');
    }
    
    // Tạo collection clubs nếu chưa tồn tại
    const clubsCollection = db.collection('clubs');
    
    // Tạo indexes cho clubs
    await clubsCollection.createIndex({ id: 1 });
    await clubsCollection.createIndex({ status: 1 });
    
    // Kiểm tra xem đã có dữ liệu clubs chưa
    const clubCount = await clubsCollection.countDocuments();
    
    if (clubCount === 0) {
      // Thêm dữ liệu clubs mẫu
      const sampleClubs = [
        {
          id: 'club-001',
          name: 'Music Club',
          description: 'A club for music lovers',
          type: 'cultural',
          size: 50,
          logo_url: 'https://example.com/music-club-logo.png',
          website_url: 'https://musicclub.example.com',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'club-002',
          name: 'Tech Club',
          description: 'A club for tech enthusiasts',
          type: 'technical',
          size: 120,
          logo_url: 'https://example.com/tech-club-logo.png',
          website_url: 'https://techclub.example.com',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'club-003',
          name: 'Sports Club',
          description: 'A club for sports activities',
          type: 'sports',
          size: 80,
          logo_url: 'https://example.com/sports-club-logo.png',
          website_url: 'https://sportsclub.example.com',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      
      await clubsCollection.insertMany(sampleClubs);
      console.log('Sample clubs data inserted successfully');
    } else {
      console.log('Clubs collection already has data');
    }
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
} 