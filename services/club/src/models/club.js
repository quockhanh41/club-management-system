// Mock data for clubs
export const mockClubs = [
  {
    id: 'club-001',
    name: 'Music Club',
    description: 'A club for music lovers',
    type: 'cultural',
    size: 50,
    logo_url: 'https://example.com/music-club-logo.png',
    website_url: 'https://musicclub.example.com',
    status: 'active'
  },
  {
    id: 'club-002',
    name: 'Tech Club',
    description: 'A club for tech enthusiasts',
    type: 'technical',
    size: 120,
    logo_url: 'https://example.com/tech-club-logo.png',
    website_url: 'https://techclub.example.com',
    status: 'active'
  },
  {
    id: 'club-003',
    name: 'Sports Club',
    description: 'A club for sports activities',
    type: 'sports',
    size: 80,
    logo_url: 'https://example.com/sports-club-logo.png',
    website_url: 'https://sportsclub.example.com',
    status: 'active'
  }
];

// Mock data for events
export const mockEvents = [
  {
    id: 'event-001',
    club_id: 'club-001',
    title: 'Summer Music Festival',
    description: 'Annual summer music festival',
    start_at: '2025-06-20T18:00:00Z',
    end_at: '2025-06-20T22:00:00Z',
    status: 'upcoming',
    location: 'Main Auditorium',
    max_participants: 200
  },
  {
    id: 'event-002',
    club_id: 'club-001',
    title: 'Jazz Night',
    description: 'Relaxing jazz evening',
    start_at: '2025-05-15T19:00:00Z',
    end_at: '2025-05-15T21:00:00Z',
    status: 'upcoming',
    location: 'Music Room',
    max_participants: 50
  },
  {
    id: 'event-003',
    club_id: 'club-002',
    title: 'Hackathon 2025',
    description: '24-hour coding challenge',
    start_at: '2025-07-10T09:00:00Z',
    end_at: '2025-07-11T09:00:00Z',
    status: 'upcoming',
    location: 'Computer Lab',
    max_participants: 100
  },
  {
    id: 'event-004',
    club_id: 'club-002',
    title: 'AI Workshop',
    description: 'Introduction to Artificial Intelligence',
    start_at: '2025-04-25T14:00:00Z',
    end_at: '2025-04-25T16:00:00Z',
    status: 'completed',
    location: 'Lecture Hall A',
    max_participants: 80
  },
  {
    id: 'event-005',
    club_id: 'club-003',
    title: 'Basketball Tournament',
    description: 'Inter-club basketball competition',
    start_at: '2025-06-05T10:00:00Z',
    end_at: '2025-06-05T18:00:00Z',
    status: 'upcoming',
    location: 'Sports Complex',
    max_participants: 150
  }
];
