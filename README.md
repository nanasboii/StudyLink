# StudyLink

StudyLink is a Node.js + Express + PostgreSQL tutoring platform with a multi-page frontend. It includes authentication, profiles, resources, booking/sessions, reviews, achievements, notifications, tutor verification, and admin monitoring tools.

## Services

- App/API: http://localhost:6767
- UI: http://localhost:6767/ui/
- pgAdmin: http://localhost:5050
- PostgreSQL: localhost:5432

## Quick Start

1. Install Docker Desktop.
2. From the project root, run:

```bash
docker compose up -d --build
```

3. Verify health:

```bash
http://localhost:6767/health
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

Application:

- `PORT` (default: `6767`)
- `SESSION_DURATION_HOURS` (default: `24`)
- `STREAK_TIMEZONE` (default: `Asia/Kuala_Lumpur`)
- `ADMIN_EMAIL` (default: `admin@studylink.local`)
- `ADMIN_PASSWORD` (default: `admin123`)

Database:

- `DB_HOST` (default: `localhost`)
- `DB_PORT` (default: `5432`)
- `DB_USER` (default: `studylink`)
- `DB_PASSWORD` (default: `studylink`)
- `DB_NAME` (default: `studylink`)

## Default Credentials

Database:

- User: `studylink`
- Password: `studylink`
- Database: `studylink`

Seed admin account:

- Email: `admin@studylink.local`
- Password: `admin123`

pgAdmin:

- Email: `admin@studylink.com`
- Password: `admin123`

## Auth Header

Use bearer token for protected routes:

`Authorization: Bearer <token>`

## Notes

- Tables and seed data are auto-created on first startup.
- Uploaded files are served from `/uploads`.
- Integration flow tests are available at `tests/critical-flows.integration.test.mjs`.
