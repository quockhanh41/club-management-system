# Club Management System

## 🔥 Overview
A comprehensive microservices-based platform for managing clubs, events, memberships, and recruitment campaigns. Features include user authentication, club management, event organization, payment processing, and notification systems.

## 🚀 Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express.js
- **Databases**: PostgreSQL (Auth), MongoDB (Clubs, Events)
- **API Gateway**: Kong
- **Authentication**: JWT, Role-based Access Control
- **Payment**: Momo SDK
- **Notifications**: RabbitMQ, EmailJS/SendGrid, Twilio
- **Deployment**: Docker, Vercel, Railway

## 📁 Features
- **Authentication**: Register / Login / Email verification / Password reset
- **Club Management**: Create clubs, manage members, recruitment campaigns
- **Event Management**: Create events, RSVP, QR code check-ins
- **Payment Processing (future)**: Momo integration, invoice generation
- **Notifications**: Email and SMS notifications
- **Admin Dashboard**: Comprehensive admin interface
- **Mobile Responsive**: Progressive Web App features

## 🛠️ How to Run

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL and/or MongoDB
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd club-management-system

# Use docker to start all services
docker-compose up -d

# Check service status
docker-compose logs -f

# Start frontend
cd frontend
npm i && npm run dev
```

### Available Services
- **Frontend** (Next.js) - http://localhost:3000
- **API Gateway** (Kong) - http://localhost:8000
- **Auth Service** - http://localhost:3001
- **Club Service** - http://localhost:3002
- **Event Service** - http://localhost:3003

- **Notify Service** - http://localhost:3005

## 🧪 API Documentation
- **Swagger UI**: http://localhost:3001/api/auth/docs

## 📋 Demo Accounts
For testing purposes, you can use these pre-configured demo accounts:

### Regular User & Club Manager Account
- **Email**: quockhanh4104.kn@gmail.com
- **Password**: Khanh1234@abc
- **Role**: Club Manager & Regular User
- **Permissions**: Create and manage clubs, organize events, manage members and join clubs, register for events

## 🔧 Architecture

### Microservices Structure
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │   Services      │
│   (Next.js)     │◄──►│   (Kong)        │◄──►│   (Node.js)     │
│   Port: 3000    │    │   Port: 8000    │    │   Ports: 3001-5 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Databases     │
                       │ PostgreSQL      │
                       │ MongoDB         │
                       └─────────────────┘
```

### Services Overview
- **Auth Service** (Port: 3001) - User authentication and authorization
- **Club Service** (Port: 3002) - Club and member management
- **Event Service** (Port: 3003) - Event creation and RSVP

- **Notify Service** (Port: 3005) - Email and SMS notifications


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Club Management System Team**
