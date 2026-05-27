# StudyLink

A comprehensive Node.js + Express + PostgreSQL tutoring platform featuring multi-role authentication, resource management, booking lifecycle, real-time notifications, and admin analytics.

**[📖 Full Documentation](#table-of-contents) | [🚀 Quick Start](#quick-start) | [🐳 Docker](#docker-setup) | [🔧 Development](#development)**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Docker Setup](#docker-setup)
- [API Documentation](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StudyLink is a full-featured tutoring platform with:

- **Role-based access**: Tutee, Tutor, Admin dashboards
- **Resource management**: Upload, browse, review, and track downloads
- **Booking system**: Request → Accept/Reject → Complete → Review workflow
- **User achievements**: Leaderboards, badges, daily streaks, activity calendar
- **Points economy**: Earn from activity and redeem rewards with configurable limits
- **Verification workflow**: Tutor identity verification with admin approval
- **Real-time notifications**: Activity feeds with unread indicators
- **Admin tools**: User management, analytics, activity logs, error monitoring

### Key Features

- Timezone-aware login streaks and activity calendar
- Daily login streak points (configurable)
- File and link-based resource uploads
- Public tutor profiles and reviews
- Admin moderation and analytics dashboard
- Reward redemption rules with admin override controls
- Messaging inbox with unread counters, including topbar chat badge
- Email notifications (SMTP integration)
- Session-based authentication with bearer tokens

---

## Quick Start

### Prerequisites

- **Node.js** v18 or higher ([download](https://nodejs.org/))
- **PostgreSQL** 12+ OR **Docker Desktop**
- **Git**

### Option A: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/nanasboii/StudyLink.git
cd StudyLink

# Start all services
docker compose up -d --build

# Verify services are running
docker compose ps

# Check app health
curl http://localhost:3000/health
```

Services available:
- **API**: http://localhost:3000
- **UI**: http://localhost:3000/ui/
- **pgAdmin**: http://localhost:5050
- **Database**: localhost:5432

### Option B: Local Development

```bash
# Install dependencies
npm install

# Create .env file (see Environment Variables section)
cp .env.example .env  # if available, or create manually

# Start development server
npm run dev

# In another terminal, start database
# (ensure PostgreSQL is running locally)

# Verify health
curl http://localhost:3000/health
```

---

## Project Structure

```
StudyLink/
├── src/
│   ├── server.js                 # Express API server
│   ├── seed.js                   # Database seeding
│   ├── frontend/                 # Vue 3 frontend
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── routes.js
│   │   ├── components/
│   │   ├── pages/
│   │   └── stores/
│   └── public/                   # Public assets (service worker, icons, CSS)
│       └── css/                  # Shared styling
├── tests/
│   └── critical-flows.integration.test.mjs
├── Dockerfile                    # Container build config
├── docker-compose.yml            # Multi-service orchestration
├── railway.json                  # Railway deployment config
├── studylink_backup.sql          # Database backup for seeding
├── vite.config.js                # Vue 3 build config
├── package.json
└── .env.example                  # Environment template
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express, PostgreSQL |
| **Frontend** | Vue 3, Vue Router, CSS |
| **Build** | Vite |
| **Deployment** | Docker, Railway |
| **Testing** | Node.js test runner (`node --test`) integration tests |

---

## Development

### Available Scripts

```bash
# Start development server (with hot reload)
npm run dev

# Start backend only (watch mode)
npm run dev:server

# Start frontend only (Vite)
npm run dev:frontend

# Build for production
npm run build

# Run production server
npm start

# Preview production build
npm run preview

# Run integration tests
npm run test:flows

# Seed database with sample data
npm run seed
```

### Running Tests

```bash
npm run test:flows
# Output: Integration test results for critical user flows
```

### Database Management

The app auto-initializes the schema on startup unless `SKIP_DB_INIT=true`.

**To import existing data:**

```bash
psql -h localhost -U studylink -d studylink -f studylink_backup.sql
```

**To reset database (local only):**

```bash
# Drop all data (development only!)
psql -h localhost -U studylink -d studylink -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Reinitialize
npm run dev
```

---

## Docker Setup

### Starting Services

```bash
# Build and start all services
docker compose up -d --build

# View service status
docker compose ps

# View logs for specific service
docker compose logs -f app      # Backend
docker compose logs -f postgres  # Database
docker compose logs -f pgadmin   # Admin panel
```

### Common Docker Tasks

```bash
# Stop all services
docker compose down

# Remove volumes (clears database)
docker compose down -v

# Rebuild specific service
docker compose build --no-cache app

# Access container shell
docker exec -it studylink-app bash

# View database from pgAdmin
# Navigate to http://localhost:5050
# Login: use credentials configured in your local docker-compose/.env setup
```

### Troubleshooting Docker

**App won't start / SSL connection error:**
- Ensure `DB_SSL: "false"` is set in docker-compose.yml environment
- Run: `docker compose logs app` to check error details

**Port already in use:**
```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Stop-Process -Id <PID> -Force
```

**Database not initializing:**
```bash
docker compose exec postgres psql -U studylink -d studylink -c "\dt"
# Shows all tables if initialized successfully
```

---

## Services (Local)

- **App/API**: http://localhost:3000
- **UI**: http://localhost:3000/ui/
- **pgAdmin**: http://localhost:5050
- **PostgreSQL**: localhost:5432

---

## API Endpoints

### Summary by Resource

<u>Public</u>: `GET /`, `GET /health` (`GET /api/health` alias)

<u>Auth</u>: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/change-password`, `POST /auth/delete-account`

<u>User & Profile</u>: `GET /me`, `GET /me/login-history`, `PUT /me/profile`, `PUT /me/password`, `DELETE /me`, `POST /uploads/profile-picture`

<u>Discovery</u>: `GET /courses`, `GET /tutors`, `GET /leaderboard`, `GET /users/search`, `GET /users/:id/public`, `GET /users/:id/public/reviews`

<u>Bookings</u>: `POST /bookings`, `GET /bookings/inbox`, `POST /bookings/:id/decision`, `POST /bookings/:id/complete`, `POST /bookings/:id/cancel`, `POST /bookings/:id/review`, `GET /bookings/:id/reviews`

<u>Availability</u>: `POST /availability`, `GET /availability/me`

<u>Resources</u>: `POST /resources`, `GET /resources`, `GET /resources/mine`, `GET /resources/:id`, `GET /resources/:id/file`, `PUT /resources/:id`, `DELETE /resources/:id`, `POST /resources/upload`, `POST /resources/:id/download`, `GET /resources/:id/reviews`, `POST /resources/:id/reviews`

<u>Notifications</u>: `GET /notifications`, `PATCH /notifications/mark-all-read`, `POST /notifications/:id/read`

<u>Rewards & Achievements</u>: `GET /redeem/rewards`, `GET /redeem/history`, `POST /redeem/:rewardId`, `GET /achievements/me`

<u>Messaging</u>: `GET /conversations`, `POST /conversations`, `POST /conversations/support`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`

<u>Push</u>: `GET /push/vapid-public-key`, `POST /push/subscribe`, `DELETE /push/unsubscribe`

<u>Verification</u>: `POST /tutor-verifications`, `GET /tutor-verifications/me`, `POST /uploads/verification`

<u>Admin</u>: `GET /admin/users`, `PATCH /admin/users/:id`, `GET /admin/tutor-verifications`, `POST /admin/tutor-verifications/:id/decision`, `POST /admin/tutor-verifications/:id/request-reupload`, `GET /admin/resources`, `GET /admin/analytics`, `GET /admin/activity-logs`, `GET /admin/error-logs`, `GET /admin/reward-rules`, `PATCH /admin/reward-rules/:code`, `DELETE /admin/reward-rules/:code`

### Detailed API Reference

**See [API Reference Table](#api-reference-table) below for method, path, and access control.**

### API Reference Table

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | API status summary |
| GET | `/health` | Public | DB connectivity check |
| GET | `/api/health` | Public | Health alias for proxy/env compatibility |
| GET | `/ui/*` | Public | Serves frontend shell |
| **Auth** | | | |
| POST | `/auth/register` | Public | Create account |
| POST | `/auth/login` | Public | Login (issues bearer token) |
| POST | `/auth/logout` | Authenticated | Invalidate session |
| POST | `/auth/change-password` | Authenticated | Change password |
| POST | `/auth/delete-account` | Authenticated | Delete account (auth flow) |
| **User** | | | |
| GET | `/me` | Authenticated | Current user profile |
| GET | `/me/login-history` | Authenticated | Daily login dates (calendar) |
| PUT | `/me/profile` | Authenticated | Update profile |
| PUT | `/me/password` | Authenticated | Change password (legacy profile route) |
| DELETE | `/me` | Authenticated | Delete account |
| POST | `/uploads/profile-picture` | Authenticated | Upload avatar |
| **Discovery** | | | |
| GET | `/courses` | Authenticated | List courses |
| GET | `/tutors` | Authenticated | Search tutors |
| GET | `/leaderboard` | Authenticated | Rankings/points |
| GET | `/users/search` | Authenticated | User search for messaging |
| GET | `/users/:id/public` | Authenticated | Public profile view |
| GET | `/users/:id/public/reviews` | Authenticated | Public reviews |
| **Booking** | | | |
| POST | `/bookings` | Tutee | Request session |
| GET | `/bookings/inbox` | Tutee/Tutor | View bookings |
| POST | `/bookings/:id/decision` | Tutor | Accept/reject request |
| POST | `/bookings/:id/complete` | Tutor | Mark session done |
| POST | `/bookings/:id/cancel` | Tutee/Tutor | Cancel booking |
| POST | `/bookings/:id/review` | Tutee/Tutor | Submit review |
| GET | `/bookings/:id/reviews` | Authenticated | View reviews |
| **Availability** | | | |
| POST | `/availability` | Tutor | Set schedule slots |
| GET | `/availability/me` | Tutor | Get tutor schedule |
| **Resources** | | | |
| POST | `/resources` | Authenticated | Create resource |
| GET | `/resources` | Authenticated | Browse/search |
| GET | `/resources/mine` | Authenticated | List resources uploaded by current user |
| GET | `/resources/:id` | Authenticated | View resource |
| GET | `/resources/:id/file` | Public | Open/download resource file URL |
| PUT | `/resources/:id` | Owner/Admin | Update |
| DELETE | `/resources/:id` | Owner/Admin | Delete |
| POST | `/resources/upload` | Authenticated | Upload file |
| POST | `/resources/:id/download` | Authenticated | Track download |
| GET | `/resources/:id/reviews` | Authenticated | View ratings |
| POST | `/resources/:id/reviews` | Authenticated | Add rating |
| **Notifications** | | | |
| GET | `/notifications` | Authenticated | Activity feed |
| PATCH | `/notifications/mark-all-read` | Authenticated | Mark all notifications read |
| POST | `/notifications/:id/read` | Authenticated | Mark read |
| **Rewards** | | | |
| GET | `/redeem/rewards` | Authenticated | List rewards + eligibility |
| GET | `/redeem/history` | Authenticated | Redemption history |
| POST | `/redeem/:rewardId` | Authenticated | Redeem reward |
| **Achievements** | | | |
| GET | `/achievements/me` | Authenticated | User badges |
| **Messaging** | | | |
| GET | `/conversations` | Authenticated | List conversations |
| POST | `/conversations` | Authenticated | Start direct conversation |
| POST | `/conversations/support` | Authenticated | Start/reuse support conversation |
| GET | `/conversations/:id/messages` | Authenticated | Fetch conversation messages |
| POST | `/conversations/:id/messages` | Authenticated | Send conversation message |
| **Push** | | | |
| GET | `/push/vapid-public-key` | Authenticated | Fetch VAPID public key |
| POST | `/push/subscribe` | Authenticated | Save browser push subscription |
| DELETE | `/push/unsubscribe` | Authenticated | Remove push subscription |
| **Verification** | | | |
| POST | `/tutor-verifications` | Tutor | Submit for review |
| GET | `/tutor-verifications/me` | Tutor | Check status |
| POST | `/uploads/verification` | Tutor | Upload proof doc |
| **Admin** | | | |
| GET | `/admin/users` | Admin | User management |
| PATCH | `/admin/users/:id` | Admin | Update user role |
| GET | `/admin/tutor-verifications` | Admin | Review queue |
| POST | `/admin/tutor-verifications/:id/decision` | Admin | Approve/reject |
| POST | `/admin/tutor-verifications/:id/request-reupload` | Admin | Request new doc |
| GET | `/admin/resources` | Admin | Moderation queue |
| GET | `/admin/analytics` | Admin | KPI dashboard |
| GET | `/admin/activity-logs` | Admin | Audit trail |
| GET | `/admin/error-logs` | Admin | Error monitoring |
| GET | `/admin/reward-rules` | Admin | View reward rule settings |
| PATCH | `/admin/reward-rules/:code` | Admin | Update reward rule settings |
| DELETE | `/admin/reward-rules/:code` | Admin | Reset rule to defaults |

---

### Authentication

All protected endpoints require the bearer token header:

```
Authorization: Bearer <token>
```

Obtained from `/auth/login` response.

---

## Environment Variables

Create a `.env` file in the project root. **Do not commit this file.**

### Application Settings

```env
# Server
PORT=3000
NODE_ENV=development
SESSION_DURATION_HOURS=24
STREAK_TIMEZONE=Asia/Kuala_Lumpur
LOGIN_STREAK_DAILY_POINTS=3
```

### Database (Choose One Method)

**Method 1: Connection String (recommended for hosted databases)**

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_SSL=false  # Set to false for local Docker
```

**Method 2: Individual Variables (for local PostgreSQL)**

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
```

### Production / Deployment

```env
NODE_ENV=production
SKIP_DB_INIT=true  # If you import database manually
```

### Default Credentials (Local Development)

If no external database is configured:

- **Database user**: `studylink` / password: `studylink` / database: `studylink`
- **Admin account**: created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.

⚠️ **Security**: Never publish repositories with exposed credentials. Rotate immediately if committed.

### Security Notes

- **Never commit `.env`** — this repository already includes `.env` in `.gitignore`
- Store sensitive values in environment variables on your hosting platform (Railway, etc.)
- If you accidentally commit secrets, **rotate credentials immediately**

---

## Deployment

### Railway (Recommended)

1. **Connect Repository**
   - Create a [Railway](https://railway.app) project
   - Link your GitHub repo (`nanasboii/StudyLink`)

2. **Add PostgreSQL Plugin**
   - Railway will auto-provision a managed database
   - Copy the connection string from the plugin

3. **Configure Environment**
   - Set `DATABASE_URL` or individual `DB_*` variables
   - Set `NODE_ENV=production`
   - Set `PORT=3000`
   - Optionally set `SKIP_DB_INIT=true` if importing database manually

4. **Deploy**
   - Railway auto-builds using `Dockerfile` (via `railway.json`)
   - Monitor logs for successful startup

5. **Verify**
   - Check Railway logs: should see "StudyLink API listening on port 3000"
   - Verify DB connection in logs
   - Test health endpoint

### Other Platforms

The `Dockerfile` is compatible with any Docker-hosting platform (AWS ECS, Heroku, DigitalOcean, etc.). Adjust environment variables as needed for each platform.

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Rotate any committed secrets
- [ ] Configure `DATABASE_URL` with hosted database
- [ ] Enable SSL for database if available
- [ ] Set up SMTP credentials for email notifications
- [ ] Test critical flows (login, booking, resource upload)
- [ ] Monitor error logs in dashboard
- [ ] Set up alerts for high error rates

---

## Database Management

### Schema Initialization

The app auto-initializes schema on startup unless `SKIP_DB_INIT=true`.

### Importing Data

To load a prebuilt dataset:

```bash
psql -h localhost -U studylink -d studylink -f studylink_backup.sql
```

### Resetting (Development Only)

```bash
# Drop all data and schema
psql -h localhost -U studylink -d studylink -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Reinitialize on next app start
npm run dev
```

---

## Troubleshooting

### App Won't Start

**SSL Connection Error**
```
Error: The server does not support SSL connections
```
- **Cause**: App tries to use SSL with a local Postgres that doesn't support it
- **Fix**: Set `DB_SSL=false` in `.env` or docker-compose environment
- **Docker**: Rebuild and restart: `docker compose up -d --build app`

**Port Already in Use**
```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Stop-Process -Id <PID> -Force
```

**Database Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Ensure PostgreSQL is running: `pg_isready -h localhost`
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
- Verify database exists: `psql -l`

### Docker Issues

**Containers won't start**
```bash
# View detailed logs
docker compose logs app

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

**Volume permissions**
```bash
# If running Linux, ensure Docker has proper volume permissions
sudo chown -R $USER:$USER src/uploads
```

### Authentication Issues

**Login fails with "Invalid credentials"**
- Check that user exists in database
- Verify password hash in `users` table
- Check SMTP is configured if email verification is enabled

**Bearer token rejected**
- Token may have expired (check `SESSION_DURATION_HOURS`)
- Verify token format: `Authorization: Bearer <token>`
- Check server logs for validation errors

### Database Issues

**Tables not created**
- Ensure `SKIP_DB_INIT=false` (default)
- Check app logs for schema creation errors
- Manually create schema: `psql -f studylink_backup.sql`

**Migrations needed**
- This project auto-initializes; no manual migrations needed
- If modifying schema, update initialization logic in [src/server.js](src/server.js)

---

## Contributing

### Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/nanasboii/StudyLink.git
   cd StudyLink
   ```

2. **Install & Setup**
   ```bash
   npm install
   cp .env.example .env  # Create your local .env
   docker compose up -d  # or: npm run dev (with local Postgres)
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Code Guidelines

- **Node.js**: Follow ES6+ conventions
- **Frontend**: Vanilla JS or Vue 3 (migration in progress)
- **API Routes**: Keep endpoints RESTful
- **Database**: Use prepared statements to prevent SQL injection
- **Testing**: Write integration tests in `tests/critical-flows.integration.test.mjs`

### Testing Your Changes

```bash
# Run integration tests
npm run test:flows

# Verify no obvious errors
curl http://localhost:3000/health
```

### Commit Message Format

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: improve code structure
test: add/update tests
```

### Submitting a Pull Request

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open PR on GitHub**
   - Link any related issues
   - Describe changes and testing performed
   - Ensure CI/tests pass

3. **Code Review**
   - Address feedback from maintainers
   - Update PR as needed

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) file for details.

---

## Support & Contact

For issues, feature requests, or questions:
- **Open an issue** on GitHub
- **Email**: nanasboii@example.com (if applicable)
- **Documentation**: See [VUE_MIGRATION.md](VUE_MIGRATION.md) for frontend migration status

---
