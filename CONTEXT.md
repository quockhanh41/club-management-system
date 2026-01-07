***

# Club Management System Context

## Project Overview
This is a microservices-based Club Management System designed to handle university club operations, events, memberships, and recruitment. The system is composed of a Next.js frontend, multiple Node.js backend services, an API Gateway, and necessary infrastructure configuration.

## Architecture
- **Pattern:** Microservices
- **Communication:**
  - Synchronous: HTTP/REST via Kong API Gateway.
  - Asynchronous: RabbitMQ (AMQP) for inter-service messaging.
- **Gateway:** Kong (DB-less mode) handles routing, authentication (JWT), and rate limiting.

## Tech Stack

### Frontend (`/frontend`)
- **Framework:** Next.js 15.2 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Radix UI Primitives (likely via `shadcn/ui`), `lucide-react` icons.
- **State/Data:** Zustand, React Hook Form, Zod.
- **Tools:** `date-fns` for dates, `react-qr-code` for QR generation.

### Backend Services (`/services`)
All services appear to run on **Node.js** (v18+) and use **Express.js**.

1.  **Auth Service** (`/services/auth`)
    -   **Port:** 3001
    -   **DB:** PostgreSQL (Sequelize ORM)
    -   **Responsibility:** User management, authentication (JWT), role-based access control (RBAC).
    -   **Key Deps:** `bcryptjs`, `jsonwebtoken`, `joi`.

2.  **Club Service** (`/services/club`)
    -   **Port:** 3002
    -   **DB:** MongoDB (Mongoose ODM)
    -   **Responsibility:** Club profiles, memberships, structure.
    -   **Key Deps:** `mongoose`, `joi`, `amqplib`.

3.  **Event Service** (`/services/event`)
    -   **Port:** 3003
    -   **DB:** MongoDB
    -   **Responsibility:** Event creation, registration, scheduling.

4.  **Image Service** (`/services/image`)
    -   **Port:** 3004
    -   **Storage:** Cloudinary
    -   **Responsibility:** Image upload and management.

5.  **Notify Service** (`/services/notify`)
    -   **Port:** 3005
    -   **Responsibility:** Sending notifications (Email/Push).
    -   **Communication:** Consumes messages from RabbitMQ.

### Infrastructure & DevOps
-   **Docker:** `docker-compose.yml` orchestrates all services locally.
-   **API Gateway:** Kong (configured via `api-gateway/kong.yml`).
-   **Cloud:** AWS (Terraform configurations in `/terraform`).
-   **CI/CD:** GitHub Actions (`.github/workflows/e2e-tests.yml`).

### Database & Seeding
-   **Scripts:** Python scripts in `/database_script`.
-   **Master Seed:** `database_script/seed_all_services_enhanced_v3.py`.
-   **Utils:** Python utilities for image generation and DB connections.

### Testing
-   **E2E:** Playwright (TypeScript) located in `/tests/e2e`. Configured in `playwright.config.ts`.
-   **Unit/Integration:** Jest (within individual service directories).

## Developer Workflow
-   **Start All:** `docker-compose up`
-   **Frontend Dev:** `cd frontend && npm run dev`
-   **Service Dev:** `cd services/<service> && npm run dev`
-   **Run E2E:** `npm run test:e2e`
-   **Seed Data:** Run the python scripts in `database_script/`.

## Key Directories
-   `api-gateway/`: Kong configuration.
-   `database_script/`: Python data seeding scripts.
-   `docs/`: Project documentation.
-   `frontend/`: Next.js application.
-   `services/`: Backend microservices.
-   `terraform/`: IaC for AWS deployment.
-   `tests/`: End-to-end tests.