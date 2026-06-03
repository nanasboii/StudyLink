# StudyLink

A full-stack tutoring platform built with Node.js, Express, PostgreSQL, and Vue 3. StudyLink supports tutees, tutors, and admins with resource browsing, booking, messaging, verification, rewards, notifications, and analytics.

**[?? Full Documentation](#table-of-contents) | [?? Quick Start](#quick-start) | [?? Docker](#docker-setup) | [?? Development](#development)**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Docker Setup](#docker-setup)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StudyLink is a production-ready tutoring platform with the following capabilities:

- **Multi-role access**: learners, tutors, and admins
- **Resource marketplace**: upload, search, download, review, and manage resources
- **Booking lifecycle**: request, accept/reject, complete, review, and cancel tutoring sessions
- **Verification workflow**: tutors submit proof documents and admins review, approve, reject, or request reuploads
- **Points & rewards**: leaderboards, badges, redeemable rewards, and activity-based points
- **Notifications**: in-app notifications and push subscription support
- **Messaging**: conversations between users and support messaging
- **Admin analytics**: dashboards for users, resources, bookings, errors, and activity logs

### Key Features

- Tutor and tutee dashboards
- Mobile-responsive Vue 3 frontend
- File upload handling for resources, profile pictures, and verification documents
- Email notifications via SMTP
- Web push integration with VAPID keys
- PostgreSQL persistence with connection string and individual DB config support
- Docker and Railway deployment support

---

## Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** 12+ OR **Docker Desktop**
- **Git**

### Option A: Docker (Recommended)

```bash
git clone https://github.com/nanasboii/StudyLink.git
cd StudyLink

docker compose up -d --build
docker compose ps
curl http://localhost:3000/health
```

Available services:

- **Backend API**: http://localhost:3000
- **UI**: http://localhost:3000/ui/
- **pgAdmin**: http://localhost:5050
- **PostgreSQL**: localhost:5432

### Option B: Local Development

```bash
npm install
cp .env.example .env  # if available or create .env manually
npm run dev
```

Open the browser at `http://localhost:3000/ui/`.

---

## Project Structure

```text
StudyLink/
+-- src/
¦   +-- server.js                 # Express API server
¦   +-- seed.js                   # Database seeding and sample data
¦   +-- frontend/                 # Vue 3 frontend
¦   ¦   +-- App.vue
¦   ¦   +-- main.js
¦   ¦   +-- routes.js
¦   ¦   +-- auth.js
¦   ¦   +-- api.js
¦   ¦   +-- components/
¦   ¦   +-- pages/
¦   ¦   +-- router/
¦   +-- public/                   # Legacy public/static assets
¦       +-- css/
+-- tests/
¦   +-- critical-flows.integration.test.mjs
+-- Dockerfile                    # Container build config
+-- docker-compose.yml            # Multi-service orchestration
+-- railway.json                  # Railway deployment config
+-- studylink_backup.sql          # Sample database backup
+-- vite.config.js                # Vite build config
+-- package.json
+-- .env.example                  # Environment template
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, PostgreSQL |
| Frontend | Vue 3, Vue Router, Vite |
| Auth | Session-based tokens, role-based access |
| File Uploads | Multer, local uploads |
| Deployment | Docker, Railway |
| Testing | Node.js test runner (`node --test`) |

---

## Development

### Available Scripts

```bash
npm run dev
npm run dev:server
npm run dev:frontend
npm run build
npm start
npm run preview
npm run test:flows
npm run seed
npm run security:scan
```

### Notes

- `npm run dev` launches backend and frontend concurrently
- `npm run build` compiles the frontend for production
- `npm start` runs the production server from `src/server.js`
- `npm run preview` previews the built frontend
- `npm run test:flows` runs integration tests
- `npm run seed` populates sample data

### Database Management

The app initializes the DB schema automatically unless `SKIP_DB_INIT=true`.

Import existing data:

```bash
psql -h localhost -U studylink -d studylink -f studylink_backup.sql
```

Reset local database:

```bash
psql -h localhost -U studylink -d studylink -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run dev
```

---

## Docker Setup

### Start Services

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f pgadmin
```

### Stop and Cleanup

```bash
docker compose down
docker compose down -v
docker compose build --no-cache app
docker exec -it studylink-app bash
```

### Troubleshooting

- If the app fails due to DB SSL settings, set `DB_SSL=false` for local Docker.
- If the port is in use, stop the conflicting process.
- Check logs with `docker compose logs -f app`.

---

## API Documentation

### Core Endpoints

**Public**

- `GET /` — API status
- `GET /health` — health check
- `GET /api/health` — health alias

**Auth**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `POST /auth/delete-account`

**User & Profile**

- `GET /me`
- `GET /me/login-history`
- `PUT /me/profile`
- `PUT /me/password`
- `DELETE /me`
- `POST /uploads/profile-picture`

**Discovery**

- `GET /courses`
- `GET /tutors`
- `GET /leaderboard`
- `GET /users/search`
- `GET /users/:id/public`
- `GET /users/:id/public/reviews`

**Bookings**

- `POST /bookings`
- `GET /bookings/inbox`
- `POST /bookings/:id/decision`
- `POST /bookings/:id/complete`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/review`
- `GET /bookings/:id/reviews`

**Availability**

- `POST /availability`
- `GET /availability/me`

**Resources**

- `POST /resources`
- `GET /resources`
- `GET /resources/mine`
- `GET /resources/:id`
- `GET /resources/:id/file`
- `PUT /resources/:id`
- `DELETE /resources/:id`
- `POST /resources/upload`
- `POST /resources/:id/download`
- `GET /resources/:id/reviews`
- `POST /resources/:id/reviews`

**Notifications**

- `GET /notifications`
- `PATCH /notifications/mark-all-read`
- `POST /notifications/:id/read`

**Rewards & Achievements**

- `GET /redeem/rewards`
- `GET /redeem/history`
- `POST /redeem/:rewardId`
- `GET /achievements/me`

**Messaging**

- `GET /conversations`
- `POST /conversations`
- `POST /conversations/support`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`

**Push**

- `GET /push/vapid-public-key`
- `POST /push/subscribe`
- `DELETE /push/unsubscribe`

**Verification**

- `POST /tutor-verifications`
- `GET /tutor-verifications/me`
- `POST /uploads/verification`
- `POST /tutor-verifications/:id/reupload`

**Admin**

- `GET /admin/users`
- `PATCH /admin/users/:id`
- `GET /admin/tutor-verifications`
- `POST /admin/tutor-verifications/:id/decision`
- `POST /admin/tutor-verifications/:id/request-reupload`
- `GET /admin/resources`
- `GET /admin/analytics`
- `GET /admin/activity-logs`
- `GET /admin/error-logs`
- `GET /admin/reward-rules`
- `PATCH /admin/reward-rules/:code`
- `DELETE /admin/reward-rules/:code`

### Authentication

Protected endpoints require:

```http
Authorization: Bearer <token>
```

The bearer token is returned from `POST /auth/login`.

---

## Environment Variables

Create a `.env` file in the project root and do not commit it.

### Application Settings

```env
PORT=3000
NODE_ENV=development
SESSION_DURATION_HOURS=24
STREAK_TIMEZONE=Asia/Kuala_Lumpur
LOGIN_STREAK_DAILY_POINTS=3
```

### Database Configuration

**Method 1: Connection string**

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_SSL=false
```

**Method 2: Individual settings**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=studylink
DB_PASSWORD=studylink
DB_NAME=studylink
DB_SSL=false
```

### Email (SMTP)

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-email@ethereal.email
SMTP_PASS=your-email-password
SMTP_FROM=your-email@domain.com
ADMIN_EMAIL=admin@yourdomain.com
```

### Push / VAPID

```env
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
```

### Production Settings

```env
NODE_ENV=production
SKIP_DB_INIT=true
```

### Local Defaults

If no DB values are provided, the default local database credentials are:

- `DB_USER=studylink`
- `DB_PASSWORD=studylink`
- `DB_NAME=studylink`

---

## Deployment

### Railway

1. Create a Railway project and connect the GitHub repository.
2. Add a PostgreSQL plugin and copy the connection string.
3. Set environment variables:
   - `DATABASE_URL`
   - `NODE_ENV=production`
   - `PORT=3000`
   - `SKIP_DB_INIT=true`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
4. Deploy. Railway uses `Dockerfile` and `railway.json` automatically.
5. Verify logs and the health endpoint.

### Other Hosting

The `Dockerfile` is compatible with Docker-based hosting platforms. Use the same environment variables and verify your database connection and SMTP settings.

### Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` configured
- [ ] `DB_SSL` set correctly
- [ ] SMTP credentials configured
- [ ] VAPID keys configured
- [ ] `SKIP_DB_INIT=true` if database schema is already present

---

## Troubleshooting

- If startup fails, inspect logs with `docker compose logs -f app`.
- If DB connection fails, verify `DATABASE_URL` or DB environment variables.
- If email fails, verify SMTP credentials.
- If push notifications fail, verify VAPID keys.

---

## Contributing

To contribute:

1. Fork the repo.
2. Create a feature branch.
3. Open a pull request with a clear description.
4. Make sure the project builds and tests run.

---

## License

This repository does not currently include a specific license file.
