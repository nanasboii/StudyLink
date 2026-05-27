# Vue Frontend Migration - Development Guide

## Running the Project

The project now has a **split development setup**:
- **Express Backend API**: Runs on port 3000
- **Vue Frontend (Vite)**: Runs on port 5173 (with proxy to API)

### Quick Start

**Terminal 1 - Start the backend:**
```bash
npm run dev:server
```

**Terminal 2 - Start the frontend:**
```bash
npm run dev:frontend
```

Or run both together:
```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

## Project Structure

```
src/
├── server.js                      # Express backend
├── public/                        # Legacy static files (CSS, old HTML)
│   ├── css/                       # All CSS files
│   ├── js/                        # Old JS logic (being migrated)
│   └── pages/                     # Old HTML pages
└── frontend/                      # NEW Vue frontend
    ├── main.js                    # Entry point
    ├── App.vue                    # Root component
    ├── components/
    │   ├── Topbar.vue            # Top navigation
    │   └── BottomNav.vue         # Bottom navigation
    ├── pages/                    # Page components (18 pages)
    ├── router/                   # Vue Router configuration
    ├── stores/                   # Pinia stores (optional)
    └── utils/                    # Utilities (auth.js, api.js)
```

## Pages to Migrate

All active pages are fully migrated to Vue 3 `<script setup>`:

- [x] Login.vue — `<script setup>`, full UNIMAS-branded UI, auth flow
- [x] Register.vue — `<script setup>`, role-based fields, validation
- [x] Resources.vue — `<script setup>`, search, Shopee-style filter panel, upload modal, pagination
- [x] ResourceDetail.vue — `<script setup>`, metadata, download, reviews
- [x] Tutors.vue — `<script setup>`, search, skill chips, booking modal
- [x] Review.vue — `<script setup>`, completed bookings list, review form, pre-fills bookingId from route
- [x] Session.vue — `<script setup>`, role-based (tutor availability / tutee booking), session list
- [x] Verification.vue — `<script setup>`, file upload, applications list, status notifications
- [x] Leaderboards.vue — `<script setup>`, tabs (overall/tutor/tutee), rank cards, links to PublicProfile
- [x] Profile.vue — `<script setup>`, hero card, edit mode, avatar with initials fallback
- [x] PublicProfile.vue — `<script setup>`, public stats card, back navigation
- [x] Settings.vue — `<script setup>`, 2FA toggle, change password modal, delete account modal
- [x] Notifications.vue — `<script setup>`, filter (all/unread), relative timestamps, load more
- [x] Achievements.vue — `<script setup>`, badge grid, progress bars, points display
- [x] AdminVerifications.vue — `<script setup>`, approve/reject/re-upload, correct API endpoint
- [x] AdminResources.vue — `<script setup>`, search, delete
- [x] AdminAnalytics.vue — `<script setup>`, stats grid, 7-day trends
- [x] AdminActivity.vue — `<script setup>`, searchable activity logs
- [x] AdminErrors.vue — `<script setup>`, searchable error logs with status badges

## Bug Fixes Applied

- **Router**: `/review/:resourceId?` — optional param so `/review` (no ID) still matches
- **Router guard**: `beforeEach` now enforces `requiresAdmin` meta — non-admin users are redirected to `/resources`
- **AdminVerifications**: Fixed wrong endpoint (`/admin/verifications` → `/admin/tutor-verifications`)
- **routes.js PAGES**: Fixed all admin paths (`/admin-verifications` → `/admin/verifications`, etc.)
- **Settings**: Fixed wrong endpoint (`/auth/change-password` → `PUT /me/password`)

## Migration Status: ✅ Complete

All pages migrated. No Options API components remain in `src/frontend/pages/`.

## API Integration

All API calls use the `api()` function in `src/frontend/utils/api.js`:

```javascript
import { api } from '@/api.js'

// GET request
const data = await api('/users/me')

// POST request
const result = await api('/auth/login', 'POST', { email, password })
```

## Authentication

Session is stored in localStorage:
- `studylinkToken` - JWT token
- `studylinkUser` - User data (JSON)

Access with:
```javascript
import { getToken, getUser, setSession, clearSession } from '../utils/auth.js'
```

## Styling

All existing CSS files are imported in `main.js`:
- `base.css` - Global styles
- Page-specific CSS still works

You can gradually migrate CSS to scoped Vue component styles.

## Database Connection

Your `.env` is configured for Supabase:
```
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
```

The Express backend connects automatically.

## Building for Production

```bash
npm run build
```

This generates optimized files in the `dist/` folder.

To preview:
```bash
npm run preview
```

---

**Started:** May 11, 2026
**Status:** Vue skeleton with 18 placeholder pages ready
**Next:** Complete page functionality
