# StudyLink App Backend

Backend implementation of the StudyLink use cases from your UML/activity/sequence diagrams, including:

- authentication and session management
- profile management
- tutor availability and booking
- resource upload, browsing, download handoff, and rating
- gamification (learning points + badges)
- notifications
- tutor verification workflow for admin
- PostgreSQL + pgAdmin with Docker Compose

## Services

- App: http://localhost:3000
- UI: http://localhost:3000/ui/
- pgAdmin: http://localhost:5050
- PostgreSQL: localhost:5432

## UI File Structure (Editable Per Page)

Each page is now in its own file, with its own function file:

- Login page: `src/public/pages/login.html` + `src/public/js/pages/login.js`
- Register page: `src/public/pages/register.html` + `src/public/js/pages/register.js`
- Resources page: `src/public/pages/resources.html` + `src/public/js/pages/resources.js`
- Tutor page: `src/public/pages/tutors.html` + `src/public/js/pages/tutors.js`
- Review page: `src/public/pages/review.html` + `src/public/js/pages/review.js`
- Leaderboards page: `src/public/pages/leaderboards.html` + `src/public/js/pages/leaderboards.js`
- Session page: `src/public/pages/session.html` + `src/public/js/pages/session.js`
- Verification page: `src/public/pages/verification.html` + `src/public/js/pages/verification.js`

Shared logic:

- API/session helpers: `src/public/js/api.js`
- Top/bottom navigation: `src/public/js/nav.js`
- Central page routes: `src/public/js/routes.js`

Styling structure:

- Shared base styles: `src/public/css/base.css`
- Page-level styles: `src/public/css/pages/*.css`
- Compatibility stylesheet alias: `src/public/styles.css`

## Default Credentials

### Database
- User: `studylink`
- Password: `studylink`
- Database: `studylink`

### App Admin Seed
- Email: `admin@studylink.local`
- Password: `admin123`

### pgAdmin
- Email: `admin@studylink.com`
- Password: `admin123`

## Start

1. Install Docker Desktop.
2. From this folder, run:

```bash
docker compose up --build
```

3. Open `http://localhost:3000/health` to verify the app can reach PostgreSQL.
4. Open `http://localhost:5050` for pgAdmin.

## Implemented Feature Areas

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

### User Profile
- `GET /me`
- `PUT /me/profile`
- `PUT /me/password`
- `DELETE /me`

### Courses and Leaderboard
- `GET /courses`
- `GET /leaderboard`

### Tutor Discovery and Session Booking
- `POST /availability` (tutor)
- `GET /availability/me` (tutor)
- `GET /tutors?courseCode=...`
- `POST /bookings` (tutee)
- `GET /bookings/inbox`
- `POST /bookings/:id/decision` (tutor accepts/rejects)
- `POST /bookings/:id/complete` (tutor)
- `POST /bookings/:id/review` (booking review)

### Resource Sharing
- `POST /resources`
- `GET /resources?courseCode=...&resourceType=...`
- `POST /resources/:id/download`
- `POST /resources/:id/reviews`

### Verification and Administration
- `POST /tutor-verifications` (tutor applies)
- `GET /admin/tutor-verifications` (admin)
- `POST /admin/tutor-verifications/:id/decision` (admin)

### Gamification and Notifications
- `GET /achievements/me`
- `GET /notifications`
- `POST /notifications/:id/read`

## Auth Usage

Use bearer token from login response:

`Authorization: Bearer <token>`

## Notes

- This is an API-first implementation. You can connect React, Vue, or mobile clients to these endpoints.
- File upload is represented by `fileUrl` + metadata for now, so you can later plug in local/object storage.
- On first startup, the server auto-creates tables and seeds default courses, achievements, and an admin account.

## pgAdmin Connection

Create a new server in pgAdmin with:

- Name: `StudyLink PostgreSQL`
- Host name/address: `postgres`
- Port: `5432`
- Maintenance database: `studylink`
- Username: `studylink`
- Password: `studylink`

If you run pgAdmin outside Docker, use `localhost` instead of `postgres`.
