# Club Service

This service handles club-related operations including club information and event management.

## Features

### US-006: Filter/Search Events of Club
**Endpoint:** `GET /api/clubs/{id}/events`

Filter and search events for a specific club with various parameters.

#### Query Parameters:
- `status` (optional): Filter by event status
  - Values: `upcoming`, `ongoing`, `completed`, `cancelled`
- `start_from` (optional): Filter events starting from this date (YYYY-MM-DD format)
- `start_to` (optional): Filter events starting before this date (YYYY-MM-DD format)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of events per page (default: 10, max: 100)

#### Example Request:
```bash
GET /api/clubs/club-001/events?status=upcoming&start_from=2025-06-01&start_to=2025-07-01&page=1&limit=10
```

#### Example Response:
```json
{
  "total": 1,
  "results": [
    {
      "id": "event-001",
      "title": "Summer Music Festival",
      "start_at": "2025-06-20T18:00:00Z",
      "status": "upcoming"
    }
  ]
}
```

#### Error Responses:
- `404 CLUB_NOT_FOUND`: When the specified club doesn't exist
- `400 VALIDATION_ERROR`: When query parameters are invalid

### US-007: View Club Info
**Endpoint:** `GET /api/clubs/{id}`

Get detailed information about a specific club.

## Architecture

The service follows a layered architecture:

- **Routes** (`src/routes/`): Define API endpoints
- **Controllers** (`src/controllers/`): Handle HTTP requests and responses
- **Services** (`src/services/`): Contain business logic
- **Repositories** (`src/repositories/`): Handle data access
- **Models** (`src/models/`): Define data structures
- **DTOs** (`src/dtos/`): Validate and transform request data
- **Middlewares** (`src/middlewares/`): Handle cross-cutting concerns

## Authentication

The service uses header-based authentication where the API Gateway verifies JWT tokens and passes user information via headers:
- `x-user-id`: User ID
- `x-user-email`: User email
- `x-user-full-name`: User full name
- `x-user-roles`: User roles
- `x-user-email-verified`: Email verification status

## Running the Service

1. Install dependencies:
```bash
npm install
```

2. Start the service:
```bash
npm start
```

3. For development with auto-restart:
```bash
npm run dev
```

The service will run on port 3002 by default.

## Testing

Run the test script to verify the US-006 endpoint:
```bash
node test-club-events.js
```

## Mock Data

The service currently uses mock data for demonstration purposes. In a production environment, this would be replaced with a real database connection. 