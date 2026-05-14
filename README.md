# StudyLink

StudyLink is a full-stack tutoring platform transitioning to a **Vue 3 + Vite** frontend, supported by a Node.js + Express backend and a PostgreSQL database. It includes authentication, profiles, resources, booking/sessions, reviews, achievements, notifications, tutor verification, and admin monitoring tools.

## Services (Local Development)

- **Frontend (Vue/Vite):** http://localhost:5173
- **App/API (Express):** http://localhost:3000
- **PostgreSQL:** Remote (e.g. Supabase) or local (`localhost:5432`)

## Quick Start (Local)

1. Make sure you have Node.js (v18+) installed.
2. Initialize your local environment by creating a `.env` file (see **Environment Variables** below).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start both the Vite frontend and Express backend concurrently:
   ```bash
   npm run dev
   ```
5. Open your browser pointing to http://localhost:5173. The backend API runs cleanly on port 3000.

To run them separately (in two terminals):
- Backend: `npm run dev:server`
- Frontend: `npm run dev:frontend`

## Project Structure & Vue Migration

The application is currently transitioning from static HTML files to a Modern Vue Single-Page Application (SPA) structure:

- `src/server.js`: Express Backend API
- `src/frontend/`: The new Vue 3 frontend (components, pages, routing, Pinia stores)
- `src/public/`: Legacy static HTML, JS, and CSS files (gradually being migrated)

For details on the migration process, see [VUE_MIGRATION.md](VUE_MIGRATION.md).

## Key Features

- Role-based UX for `tutee`, `tutor`, and `admin`
- Resource upload (file/link), browse, detail view, download tracking, and reviews
- Tutor discovery and booking lifecycle (request, decision, complete, cancel)
- Booking reviews and public profile reviews
- Leaderboards and achievements
- Notifications with unread indicators
- Tutor verification workflow and admin decision/reupload request
- Admin analytics, admin activity logs, server error logs, and resource moderation views
- Daily login streak + monthly activity calendar modal bb.

### Login Streak and Activity Calendar

- Streak data is stored on `users.login_streak` and `users.last_login_at`
- Per-day login history is stored in `user_login_history`
- Calendar highlights real login dates, supports full-month view, and lets users navigate past months
- Day boundary logic is timezone-aware via `STREAK_TIMEZONE`
- If a user has streak data but no history rows yet, history is backfilled

## Environment Variables

Recommended runtime variables (set in `.env` for local development):

**Application:**
- `PORT` (default: `3000` for the backend server)
- `SESSION_DURATION_HOURS` (default: `24`)
- `STREAK_TIMEZONE` (default: `Asia/Kuala_Lumpur`)
- `FRONTEND_ORIGIN` (required for email links in production `https://studylink.up.railway.app`)

**Database:**
- Use a single connection string: `DATABASE_URL` (recommended for hosted DBs like Supabase)
- *Example for Supabase:* `DATABASE_URL=postgresql://postgres:PASSWORD@xyz.supabase.co:5432/postgres`

Notes:
- Do NOT commit an `.env` file. This repo already ignores `.env` in `.gitignore`.

## Default Credentials (Local/Dev Dataset)

If you use the provided `studylink_backup.sql` file to seed your DB:

- Seed admin account: `admin@studylink.local` / `admin123`

## Running tests

```bash
npm run test:flows
```

## Production Building

To build the Vue application for production:
```bash
npm run build
```
This generates optimized files in the `dist/` folder. You can preview the finalized frontend build using:
```bash
npm run preview
```

## Useful files

- Main Server Entry: [src/server.js](src/server.js)
- Vue Frontend Entry: [src/frontend/main.js](src/frontend/main.js)
- Migration Guide: [VUE_MIGRATION.md](VUE_MIGRATION.md)
- Sample DB backup: [studylink_backup.sql](studylink_backup.sql)
- Integration tests: [tests/critical-flows.integration.test.mjs](tests/critical-flows.integration.test.mjs)
