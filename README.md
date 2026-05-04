# StudyLink

StudyLink is a Node.js + Express + PostgreSQL tutoring platform with a multi-page frontend. It includes authentication, profiles, resources, booking/sessions, reviews, achievements, notifications, tutor verification, and admin monitoring tools.

## Services (local)

- App/API: http://localhost:3000
- UI: http://localhost:3000/ui/
- PostgreSQL: localhost:5432

## Quick Start (local)

1. Install Node.js (v18+) and PostgreSQL or Docker Desktop.
2. Create a local `.env` (see **Environment** below) or run with Docker Compose:

```bash
docker compose up -d --build
```

3. Start the app (without Docker):

```bash
npm install
npm run dev
```

4. Verify health:

```bash
curl http://localhost:3000/health
```

## Current UI Pages

- `src/public/pages/login.html`
- `src/public/pages/register.html`
- `src/public/pages/resources.html`
- `src/public/pages/resource-detail.html`
- `src/public/pages/tutors.html`
- `src/public/pages/session.html`
- `src/public/pages/review.html`
- `src/public/pages/leaderboards.html`
- `src/public/pages/achievements.html`
- `src/public/pages/notifications.html`
- `src/public/pages/profile.html`
- `src/public/pages/public-profile.html`
- `src/public/pages/verification.html`
- `src/public/pages/admin-verifications.html`
- `src/public/pages/admin-resources.html`
- `src/public/pages/admin-analytics.html`
- `src/public/pages/admin-activity.html`
- `src/public/pages/admin-errors.html`

Shared frontend modules:

- `src/public/js/api.js`
- `src/public/js/nav.js`
- `src/public/js/routes.js`
- `src/public/css/base.css`
- `src/public/css/pages/*.css`

## Key Features

- Role-based UX for `tutee`, `tutor`, and `admin`
- Resource upload (file/link), browse, detail view, download tracking, and reviews
- Tutor discovery and booking lifecycle (request, decision, complete, cancel)
- Booking reviews and public profile reviews
- Leaderboards and achievements
- Notifications with unread indicators
- Tutor verification workflow and admin decision/reupload request
- Admin analytics, admin activity logs, server error logs, and resource moderation views
- Daily login streak + monthly activity calendar modal

### Login Streak and Activity Calendar

- Streak data is stored on `users.login_streak` and `users.last_login_at`
- Per-day login history is stored in `user_login_history`
- Calendar highlights real login dates, supports full-month view, and lets users navigate past months
- Day boundary logic is timezone-aware via `STREAK_TIMEZONE`
- If a user has streak data but no history rows yet, history is backfilled

## API Endpoints

### Public and System
- `GET /`
- `GET /health`
- `GET /ui/*`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

### User and Profile
- `GET /me`
- `GET /me/login-history`
- `PUT /me/profile`
- `PUT /me/password`
- `DELETE /me`
- `POST /uploads/profile-picture`

### Courses and Discovery
- `GET /courses`
- `GET /tutors`

### Availability and Booking
- `POST /availability`
- `GET /availability/me`
- `POST /bookings`
- `GET /bookings/inbox`
- `POST /bookings/:id/decision`
- `POST /bookings/:id/complete`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/review`
- `GET /bookings/:id/reviews`

### Resources
- `POST /resources`
- `GET /resources`
- `GET /resources/:id`
- `PUT /resources/:id`
- `DELETE /resources/:id`
- `POST /resources/upload`
- `POST /resources/:id/download`
- `GET /resources/:id/reviews`
- `POST /resources/:id/reviews`

### Public Profiles and Leaderboard
- `GET /leaderboard`
- `GET /users/:id/public`
- `GET /users/:id/public/reviews`

### Notifications and Achievements
- `GET /notifications`
- `POST /notifications/:id/read`
- `GET /achievements/me`

### Tutor Verification
- `POST /tutor-verifications`
- `GET /tutor-verifications/me`
- `POST /uploads/verification`

### Admin
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `GET /admin/tutor-verifications`
- `POST /admin/tutor-verifications/:id/decision`
- `POST /admin/tutor-verifications/:id/request-reupload`
- `GET /admin/resources`
- `GET /admin/analytics`
- `GET /admin/activity-logs`
- `GET /admin/error-logs`

## API Appendix (Method, Path, Auth)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | API status summary |
| GET | `/health` | Public | DB connectivity check |
| GET | `/ui/*` | Public | Serves frontend shell |
| POST | `/auth/register` | Public | Create new account |
| POST | `/auth/login` | Public | Issues token + streak payload |
| POST | `/auth/logout` | Authenticated (`tutee`/`tutor`/`admin`) | Invalidates session token |
| GET | `/me` | Authenticated (`tutee`/`tutor`/`admin`) | Current user profile |
| GET | `/me/login-history` | Authenticated (`tutee`/`tutor`/`admin`) | Daily login dates for calendar |
| PUT | `/me/profile` | Authenticated (`tutee`/`tutor`/`admin`) | Update own profile |
| PUT | `/me/password` | Authenticated (`tutee`/`tutor`/`admin`) | Change own password |
| DELETE | `/me` | Authenticated (`tutee`/`tutor`/`admin`) | Delete own account |
| POST | `/uploads/profile-picture` | Authenticated (`tutee`/`tutor`/`admin`) | Upload avatar image |
| GET | `/courses` | Authenticated (`tutee`/`tutor`/`admin`) | List courses |
| GET | `/tutors` | Authenticated (`tutee`/`tutor`/`admin`) | Tutor discovery/filtering |
| POST | `/availability` | Authenticated (`tutor`) | Set tutor schedule slots |
| GET | `/availability/me` | Authenticated (`tutor`) | Get tutor's own availability |
| POST | `/bookings` | Authenticated (`tutee`) | Create booking request |
| GET | `/bookings/inbox` | Authenticated (`tutee`/`tutor`) | Booking list/inbox |
| POST | `/bookings/:id/decision` | Authenticated (`tutor`) | Accept or reject booking |
| POST | `/bookings/:id/complete` | Authenticated (`tutor`) | Mark session completed |
| POST | `/bookings/:id/cancel` | Authenticated (`tutee`/`tutor`) | Cancel booking |
| POST | `/bookings/:id/review` | Authenticated (`tutee`/`tutor`) | Submit booking review |
| GET | `/bookings/:id/reviews` | Authenticated (`tutee`/`tutor`/`admin`) | View booking reviews |
| POST | `/resources` | Authenticated (`tutee`/`tutor`/`admin`) | Create resource entry |
| GET | `/resources` | Authenticated (`tutee`/`tutor`/`admin`) | Browse/search resources |
| GET | `/resources/:id` | Authenticated (`tutee`/`tutor`/`admin`) | Resource detail |
| PUT | `/resources/:id` | Authenticated (`tutee`/`tutor`/`admin`) | Update resource (owner/admin flow) |
| DELETE | `/resources/:id` | Authenticated (`tutee`/`tutor`/`admin`) | Delete resource (owner/admin flow) |
| POST | `/resources/upload` | Authenticated (`tutee`/`tutor`/`admin`) | Upload resource file |
| POST | `/resources/:id/download` | Authenticated (`tutee`/`tutor`/`admin`) | Track download action |
| GET | `/resources/:id/reviews` | Authenticated (`tutee`/`tutor`/`admin`) | List resource ratings/comments |
| POST | `/resources/:id/reviews` | Authenticated (`tutee`/`tutor`/`admin`) | Add resource rating/comment |
| GET | `/leaderboard` | Authenticated (`tutee`/`tutor`/`admin`) | Points/ranking data |
| GET | `/users/:id/public` | Authenticated (`tutee`/`tutor`/`admin`) | Public profile summary |
| GET | `/users/:id/public/reviews` | Authenticated (`tutee`/`tutor`/`admin`) | Public-facing review list |
| GET | `/notifications` | Authenticated (`tutee`/`tutor`/`admin`) | User notifications |
| POST | `/notifications/:id/read` | Authenticated (`tutee`/`tutor`/`admin`) | Mark notification read |
| GET | `/achievements/me` | Authenticated (`tutee`/`tutor`/`admin`) | User badges/achievements |
| POST | `/tutor-verifications` | Authenticated (`tutor`) | Submit verification request |
| GET | `/tutor-verifications/me` | Authenticated (`tutor`) | Own verification status/history |
| POST | `/uploads/verification` | Authenticated (`tutor`) | Upload verification document |
| GET | `/admin/users` | Authenticated (`admin`) | User management list |
| PATCH | `/admin/users/:id` | Authenticated (`admin`) | Update user role/verification |
| GET | `/admin/tutor-verifications` | Authenticated (`admin`) | Review verification queue |
| POST | `/admin/tutor-verifications/:id/decision` | Authenticated (`admin`) | Approve/reject verification |
| POST | `/admin/tutor-verifications/:id/request-reupload` | Authenticated (`admin`) | Request new proof upload |
| GET | `/admin/resources` | Authenticated (`admin`) | Admin resource moderation list |
| GET | `/admin/analytics` | Authenticated (`admin`) | KPI/trend dashboard data |
| GET | `/admin/activity-logs` | Authenticated (`admin`) | Admin action audit trail |
| GET | `/admin/error-logs` | Authenticated (`admin`) | Server error monitoring feed |

## Environment Variables

Recommended runtime variables (set in `.env` for local development or in Railway/host variables for production):

Application:

- `PORT` (default: `3000`)
- `SESSION_DURATION_HOURS` (default: `24`)
- `STREAK_TIMEZONE` (default: `Asia/Kuala_Lumpur`)
- `ADMIN_EMAIL` (default: `admin@studylink.local`)
- `ADMIN_PASSWORD` (default: `admin123`)

Database (two supported methods):

- Use a single connection string: `DATABASE_URL` (recommended for hosted DBs like Railway/Supabase)
- Or set individual vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

Production additions (Railway / hosted):

- `NODE_ENV=production`
- `PORT=3000` (should match `Dockerfile` EXPOSE)
- `SKIP_DB_INIT=true` to skip schema initialization if you import the SQL manually

Notes:
- Do NOT commit an `.env` file. This repo already ignores `.env` in `.gitignore`.
- If you accidentally committed secrets, rotate credentials immediately (regenerate DB password / connection string).

## Default Credentials (local/dev)

These are only used when no external DB is provided and are suitable for local testing:

- Database user: `studylink` / password: `studylink` / database: `studylink`
- Seed admin account created on DB init: `admin@studylink.local` / `admin123`

If you publish your repo or share screenshots, rotate any exposed credentials immediately.

## Auth Header

Use bearer token for protected routes:

`Authorization: Bearer <token>`

## Deployment (Railway)

1. Create a Railway project and connect the GitHub repo `nanasboii/StudyLink`.
2. Add the PostgreSQL plugin (Railway will provision a database).
3. In the Railway service variables, set either:

	- `DATABASE_URL` = the connection string from the plugin

	Or (if you prefer individual vars):

	- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

4. Also add:

	- `NODE_ENV=production`
	- `PORT=3000`
	- `SKIP_DB_INIT=true` (if you import the provided `studylink_backup.sql` instead of letting the app create schema)

5. Railway will build using the included `Dockerfile` (the repo contains `railway.json` to use the Dockerfile builder).

6. After deploy, monitor logs in Railway. You should see startup messages including "StudyLink API listening on port 3000" and DB connection success.

## Production security reminder

- Never store secrets in the repository. Use Railway env variables or a secrets manager.
- If secrets were committed, rotate them immediately.

## Local DB initialization / migration

- The app will attempt to create missing tables on startup unless `SKIP_DB_INIT=true`.
- To import a prebuilt dataset, use the provided `studylink_backup.sql`:

```bash
psql -h <host> -U <user> -d <db> -f studylink_backup.sql
```

## Running tests

```bash
npm run test:flows
```

## Useful files

- Server: [src/server.js](src/server.js)
- Dockerfile: [Dockerfile](Dockerfile)
- Railway config: [railway.json](railway.json)
- Sample DB backup: [studylink_backup.sql](studylink_backup.sql)
- Integration tests: [tests/critical-flows.integration.test.mjs](tests/critical-flows.integration.test.mjs)

---

If you want, I can also add a `README.example.env` file with recommended variables (without secrets) and a small deploy checklist for Railway. Would you like that?
