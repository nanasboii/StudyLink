# StudyLink

A full-stack peer tutoring and academic resource platform for UNIMAS students. StudyLink centralises study materials, session booking, and gamified rewards into a single web application.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (Composition API), Vue Router, Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 12+ |
| Deployment | Docker / Docker Compose |
| Notifications | Nodemailer (email), Web Push (browser) |
| Real-time | WebSocket (`ws`) |

---

## Features

**For Tutees**
- Search and download study resources (past papers, lecture notes, slides, links)
- Browse and book verified peer tutors by course
- Receive in-app and push notifications for bookings and reviews
- Earn Learning Points for attending sessions and contributing resources
- View personal achievements, badges, and leaderboard ranking

**For Tutors**
- Upload and manage study resources
- Accept or reject session booking requests
- Track earned points, badge progress, and contribution history
- Submit credentials for admin verification

**For Admins**
- Review and approve tutor verification submissions
- Manage platform resources and reward rules
- View analytics, activity logs, and error reports

---

## Project Structure

```
studylink/
├── src/
│   ├── server.js                    # Express API server
│   ├── seed.js                      # Database seed script
│   ├── seed-quizzes.js              # Seed script for sample quizzes
│   ├── migrate-profile-pictures.js  # One-off migration: filesystem -> DB (BYTEA)
│   ├── migrate-quizzes.js           # One-off migration for quiz schema changes
│   ├── uploads/                     # User-uploaded files (mounted volume; legacy assets only)
│   └── frontend/
│       ├── main.js
│       ├── App.vue
│       ├── api.js             # Shared fetch utility
│       ├── records.js         # Data normalisation helpers
│       ├── router/index.js
│       ├── routes.js
│       ├── push.js            # Service worker / push registration
│       ├── pages/             # Route-level page components
│       └── components/        # Shared UI components (Topbar, etc.)
├── src/public/
│   └── css/
│       ├── base.css           # CSS variables and resets
│       └── glass-theme.css    # Glass-morphism component overrides
├── scripts/
│   └── security-scan.mjs
├── tests/
│   └── critical-flows.integration.test.mjs
├── studylink_backup.sql       # Full schema + data dump (28 tables)
├── docker-compose.yml
├── Dockerfile
├── railway.json                # Railway deployment config
├── vite.config.js
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL 12+  _(or Docker Desktop for the containerised setup)_

### 1. Clone and install

```bash
git clone <repo-url>
cd studylink
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the required values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/studylink
PORT=3001

# SMTP (email notifications)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# VAPID (browser push notifications)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

### 3. Run (standard)

```bash
npm run dev          # starts both Express server and Vite frontend concurrently
```

### 4. Run (Docker)

```bash
docker compose up -d --build
```

Services started:

| Service | URL |
|---|---|
| App | http://localhost:3001 |
| pgAdmin | http://localhost:5050 |

### 5. Restore the database

The full schema and sample data can be restored from the included dump:

```bash
# Copy the dump into the running Postgres container, then restore
docker exec -i studylink-postgres psql -U studylink -d studylink < studylink_backup.sql
```

> PowerShell users: the `<` redirect operator is not supported. Use:
> ```powershell
> Get-Content studylink_backup.sql | docker exec -i studylink-postgres psql -U studylink -d studylink
> ```

Alternatively, seed fresh sample data instead of restoring the dump:

```bash
npm run seed
node src/seed-quizzes.js
```

`npm run seed` creates two test accounts:

| Role | Email | Password |
|---|---|---|
| Tutee | tutee@example.com | password123 |
| Tutor | tutor@example.com | password123 |

> No admin account is seeded automatically. Promote a user to `admin` directly in the database, e.g.
> ```sql
> UPDATE users SET role = 'admin' WHERE email = 'tutee@example.com';
> ```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server + frontend in development mode |
| `npm run dev:server` | Express server only (with `--watch`) |
| `npm run dev:frontend` | Vite dev server only |
| `npm run build` | Production frontend build |
| `npm run seed` | Seed the database with sample data |
| `npm run test:flows` | Run critical-flow integration tests |
| `npm run security:scan` | Run security scan across all files |
| `npm run security:scan:staged` | Run security scan on staged files only |
| `node src/seed-quizzes.js` | Seed sample quizzes |
| `node src/migrate-profile-pictures.js` | One-off: migrate legacy filesystem profile pictures into the `profile_picture` DB column |
| `node src/migrate-quizzes.js` | One-off: migrate legacy quiz records to the current schema |

> The `migrate-*.js` scripts are retained for examiner reproducibility and are not part of the normal run path — the current schema (via `studylink_backup.sql`) already reflects their end state.

---

## Design System

StudyLink uses a glass-morphism visual theme defined in `src/public/css/`.

**Core palette:**

| Token | Variable | Hex |
|---|---|---|
| Deep Blue | `--ink`, `--surface-dark` | `#021A54` |
| Vibrant Pink | `--primary` | `#FF85BB` |
| Light Pink | `--primary-soft` | `#FFCEE3` |
| Off-White | `--canvas-parchment` | `#F5F5F5` |

See `theme-reference.md` for the full CSS variable reference.

---

## Pages

| Route | Component | Auth | Roles |
|---|---|---|---|
| `/login` | Login.vue | — | All |
| `/register` | Register.vue | — | All |
| `/resources` | Resources.vue | ✓ | All |
| `/tutors` | Tutors.vue | ✓ | Tutee |
| `/session/:id?` | Session.vue | ✓ | All |
| `/review/:resourceId?` | Review.vue | ✓ | All |
| `/leaderboards` | Leaderboards.vue | ✓ | All |
| `/notifications` | Notifications.vue | ✓ | All |
| `/achievements` | Achievements.vue | ✓ | All |
| `/redeem` | Redeem.vue | ✓ | All |
| `/quizzes` | Quizzes.vue | ✓ | All |
| `/quizzes/create` | CreateQuiz.vue | ✓ | Tutor, Admin |
| `/quizzes/:id/play` | PlayQuiz.vue | ✓ | All |
| `/profile` | Profile.vue | ✓ | All |
| `/settings` | Settings.vue | ✓ | All |
| `/messages` | Messages.vue | ✓ | All |
| `/my-resources` | MyResources.vue | ✓ | Tutor, Admin |
| `/verification` | Verification.vue | ✓ | Tutor, Admin |
| `/admin/review-verifications` | AdminReviewVerification.vue | ✓ | Admin |
| `/admin/resources` | AdminResources.vue | ✓ | Admin |
| `/admin/analytics` | AdminAnalytics.vue | ✓ | Admin |
| `/admin/activity` | AdminActivity.vue | ✓ | Admin |
| `/admin/errors` | AdminErrors.vue | ✓ | Admin |
| `/admin/reward-rules` | AdminRewardRules.vue | ✓ | Admin |

---

## User Roles

| Role | Description |
|---|---|
| `tutee` | Student seeking tutoring and resources |
| `tutor` | Verified peer tutor who can upload resources and accept bookings |
| `admin` | Platform administrator with full management access |

---

## File Storage

| Asset type | Storage |
|---|---|
| Profile pictures | Stored as binary data (`BYTEA`) in the `users` table, served via `GET /profile-picture/:userId` |
| Resources (notes, papers, slides) | Stored via Supabase storage / mounted `uploads/` volume |
| Legacy profile pictures | Older filesystem-based pictures (`/uploads/profile-pictures/...`) remain readable through a backward-compatible route, but new uploads always write to the database |

---

## Testing

Integration tests cover critical platform flows (auth, booking lifecycle, resource upload, gamification):

```bash
npm run test:flows
```

---

## License

Academic project — UNIMAS Faculty of Computer Science and Information Technology (FCSIT).