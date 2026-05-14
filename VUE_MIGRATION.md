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

All 18 pages have placeholder components ready:
- [ ] Login.vue - Basic login form structure
- [ ] Register.vue
- [ ] Resources.vue
- [ ] Tutors.vue
- [ ] Review.vue
- [ ] Leaderboards.vue
- [ ] Session.vue
- [ ] Verification.vue
- [ ] AdminVerifications.vue
- [ ] AdminResources.vue
- [ ] AdminAnalytics.vue
- [ ] AdminActivity.vue
- [ ] AdminErrors.vue
- [ ] Notifications.vue
- [ ] Achievements.vue
- [ ] Profile.vue
- [ ] PublicProfile.vue
- [ ] ResourceDetail.vue

## Next Steps

1. **Complete Login/Register pages** with API integration
2. **Migrate Resources page** with search, filters, upload
3. **Add state management** (Pinia) for shared data
4. **Migrate remaining pages** one by one
5. **Build for production**: `npm run build`

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
DATABASE_URL=postgresql://postgres:Najminas4%23@iazelegwxxnygtuncen.supabase.co:5432/postgres
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
