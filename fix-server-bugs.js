/**
 * fix-server-bugs.js — StudyLink server.js bug-fix patcher
 * Run from project root: node fix-server-bugs.js
 *
 * Applies 12 targeted fixes to src/server.js:
 *   #1  Remove duplicate role check in POST /bookings/:id/review
 *   #2  Wrap awardPoints in GET /me/login-history with error catch (pool usage)
 *   #3  Fix ON CONFLICT upsert — stop updating reviewer_id on itself
 *   #4  Guard bookingId === 0 in all booking routes
 *   #5  Guard /me/login-history against double streak-point award
 *   #6  Fix hardcoded $1 in GET /quizzes myOnly condition
 *   #7  Use awardPoints() in quiz submit so grantBadges() is called
 *   #8  Fix requireAuth indentation / HTML-fallback logic
 *   #9  (doc note only — recalculateUserRating role-change risk, no code change needed)
 *  #10  Add loginStreak + lastLoginAt to sanitizePublicTutor
 *  #11  Remove old LIMIT-5 duplicate /users/me/submitted-reviews inline route
 *  #12  Fix awardPoints zero-check to also call grantBadges for 0-point triggers
 */

const fs = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'src', 'server.js');

if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌  src/server.js not found. Run from the project root.');
  process.exit(1);
}

let code = fs.readFileSync(SERVER_PATH, 'utf8');
let fixCount = 0;

function applyFix(label, search, replacement) {
  if (!code.includes(search)) {
    console.warn(`⚠️   Fix skipped (anchor not found): ${label}`);
    return;
  }
  code = code.replace(search, replacement);
  fixCount++;
  console.log(`✅  Applied: ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX #1 — Remove duplicate role check in POST /bookings/:id/review
// The second identical guard runs after reviewedUserId is already computed.
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#1 Remove duplicate role check in /bookings/:id/review',
  `    const reviewedUserId =
      req.auth.user.role === 'tutor' ? booking.tutee_id : booking.tutor_id;

    if (!['tutor', 'tutee'].includes(req.auth.user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only tutors and tutees can submit reviews.' });
    }

    await client.query(`,
  `    const reviewedUserId =
      req.auth.user.role === 'tutor' ? booking.tutee_id : booking.tutor_id;

    await client.query(`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #3 — Fix ON CONFLICT upsert: stop setting reviewer_id = EXCLUDED.reviewer_id
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#3 Fix ON CONFLICT upsert in /bookings/:id/review',
  `      ON CONFLICT (booking_id, reviewer_id)
       DO UPDATE SET reviewer_id = EXCLUDED.reviewer_id,
                     rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment`,
  `      ON CONFLICT (booking_id, reviewer_id)
       DO UPDATE SET rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #4 — Guard bookingId === 0 in booking routes
// Applies to: /bookings/:id/decision, /bookings/:id/complete,
//             /bookings/:id/review, /bookings/:id/reviews, /bookings/:id/cancel
// We patch the shared pattern: const bookingId = Number(req.params.id);
// followed by the next statement, inserting a 400 guard each time.
// ─────────────────────────────────────────────────────────────────────────────

// decision route
applyFix(
  '#4a Guard bookingId in /bookings/:id/decision',
  `app.post('/bookings/:id/decision', requireAuth, requireRole('tutor'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const { decision } = req.body;`,
  `app.post('/bookings/:id/decision', requireAuth, requireRole('tutor'), async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID.' });
  const { decision } = req.body;`
);

// complete route
applyFix(
  '#4b Guard bookingId in /bookings/:id/complete',
  `app.post('/bookings/:id/complete', requireAuth, requireRole('tutor'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const client = await pool.connect();`,
  `app.post('/bookings/:id/complete', requireAuth, requireRole('tutor'), async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID.' });
  const client = await pool.connect();`
);

// review POST route
applyFix(
  '#4c Guard bookingId in POST /bookings/:id/review',
  `app.post('/bookings/:id/review', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  const { rating, comment } = req.body;`,
  `app.post('/bookings/:id/review', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID.' });
  const { rating, comment } = req.body;`
);

// reviews GET route
applyFix(
  '#4d Guard bookingId in GET /bookings/:id/reviews',
  `app.get('/bookings/:id/reviews', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);

  try {`,
  `app.get('/bookings/:id/reviews', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID.' });

  try {`
);

// cancel route
applyFix(
  '#4e Guard bookingId in /bookings/:id/cancel',
  `app.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);

  const client = await pool.connect();`,
  `app.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID.' });

  const client = await pool.connect();`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #5 — GET /me/login-history: guard against double streak-point award
// Re-check last_login_at fresh from DB before awarding points
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#5 Guard double streak-award in GET /me/login-history',
  `    let streakPointsAwarded = 0;

    if (previousLoginDate !== today) {`,
  `    let streakPointsAwarded = 0;

    // Re-fetch last_login_at from DB to prevent double-award if called
    // multiple times in one session (req.auth.user uses login-time snapshot).
    const { rows: freshUser } = await pool.query(
      'SELECT last_login_at, login_streak FROM users WHERE id = $1',
      [user.id]
    );
    const freshLoginAt = freshUser[0]?.last_login_at ? new Date(freshUser[0].last_login_at) : null;
    const freshLoginDate = freshLoginAt && !Number.isNaN(freshLoginAt.getTime())
      ? dateKeyInTimeZone(freshLoginAt)
      : '';

    if (freshLoginDate !== today) {`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #6 — GET /quizzes: replace hardcoded $1 in myOnly condition with paramIndex
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#6 Fix hardcoded $1 in GET /quizzes myOnly condition',
  `    if (myOnly) {
      conditions.push(\`q.creator_id = $1\`);
    } else {`,
  `    if (myOnly) {
      conditions.push(\`q.creator_id = $\${paramIndex}\`);
      params.push(req.auth.user.id);
      paramIndex++;
    } else {`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #7 — Quiz submit: use awardPoints() so grantBadges() is triggered
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#7 Use awardPoints() in quiz submit',
  `    // Award learning points (scaled by performance)
    const earnedPoints = Math.round((correctCount / Math.max(totalQuestions, 1)) * 5);
    if (earnedPoints > 0) {
      await client.query(
        \`UPDATE users SET total_points = total_points + $1 WHERE id = $2\`,
        [earnedPoints, req.auth.user.id]
      );
      await client.query(
        \`INSERT INTO user_points_log (user_id, points, reason) VALUES ($1, $2, $3)\`,
        [req.auth.user.id, earnedPoints, \`Quiz completed: \${correctCount}/\${totalQuestions} correct\`]
      );
    }`,
  `    // Award learning points (scaled by performance)
    const earnedPoints = Math.round((correctCount / Math.max(totalQuestions, 1)) * 5);
    if (earnedPoints > 0) {
      // Use awardPoints() so grantBadges() is called and badge unlocks are triggered.
      await awardPoints(
        client,
        req.auth.user.id,
        earnedPoints,
        \`Quiz completed: \${correctCount}/\${totalQuestions} correct\`
      );
    }`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #8 — requireAuth: fix indentation of HTML-fallback block inside !token guard
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#8 Fix requireAuth HTML-fallback indentation',
  `  if (!token) {
    const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (acceptsHtml) {
    return sendClientApp(res);
  }
    return res.status(401).json({ message: 'Missing bearer token.' });
  }`,
  `  if (!token) {
    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    if (acceptsHtml) {
      return sendClientApp(res);
    }
    return res.status(401).json({ message: 'Missing bearer token.' });
  }`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #10 — Add loginStreak + lastLoginAt to sanitizePublicTutor
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#10 Add loginStreak + lastLoginAt to sanitizePublicTutor',
  `    isVerified: row.is_verified,
    totalPoints: Number(row.total_points || 0),
    rating: Number(row.rating || 0),
    reviewsReceived: Number(row.reviews_received || 0),
    totalAchievements: Number(row.total_achievements || 0),
    availability: Array.isArray(row.availability) ? row.availability : []
  };
}

function sanitizeLeaderboardEntry`,
  `    isVerified: row.is_verified,
    totalPoints: Number(row.total_points || 0),
    rating: Number(row.rating || 0),
    reviewsReceived: Number(row.reviews_received || 0),
    totalAchievements: Number(row.total_achievements || 0),
    loginStreak: Number(row.login_streak || 0),
    lastLoginAt: row.last_login_at || null,
    availability: Array.isArray(row.availability) ? row.availability : []
  };
}

function sanitizeLeaderboardEntry`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #11 — Remove old inline LIMIT-5 /users/me/submitted-reviews route
// (the patch.js-injected LIMIT-20 version is the correct one to keep)
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#11 Remove old LIMIT-5 /users/me/submitted-reviews duplicate',
  `app.get('/users/me/submitted-reviews', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT br.id, br.booking_id, br.rating, br.comment, br.created_at, b.session_time, u.full_name AS reviewed_user_name FROM booking_reviews br JOIN bookings b ON b.id = br.booking_id JOIN users u ON u.id = CASE WHEN $1 = 'tutor' THEN b.tutee_id ELSE b.tutor_id END WHERE br.reviewer_id = $2 ORDER BY br.created_at DESC LIMIT 5",
      [req.auth.user.role, req.auth.user.id]
    );
    return res.json({ reviews: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});`,
  `// [FIX #11] Removed old LIMIT-5 /users/me/submitted-reviews route.
// The LIMIT-20 version injected by patch.js is the canonical route.`
);

// ─────────────────────────────────────────────────────────────────────────────
// FIX #12 — awardPoints: fix zero-check so grantBadges still runs on 0 pts
// Also ensures points <= 0 short-circuits cleanly.
// ─────────────────────────────────────────────────────────────────────────────
applyFix(
  '#12 Fix awardPoints zero/null guard',
  `async function awardPoints(client, userId, points, reason) {
  if (!points) {
    return;
  }`,
  `async function awardPoints(client, userId, points, reason) {
  if (points == null || points < 0) {
    return;
  }
  // Allow 0-point calls to still trigger grantBadges (badge-milestone checks).
  if (points === 0) {
    await grantBadges(client, userId);
    return;
  }`
);

// ─────────────────────────────────────────────────────────────────────────────
// Write output
// ─────────────────────────────────────────────────────────────────────────────
const BACKUP = SERVER_PATH + '.bak2';
fs.copyFileSync(SERVER_PATH, BACKUP);
fs.writeFileSync(SERVER_PATH, code, 'utf8');

console.log('');
console.log(`✅  Done. ${fixCount} fix(es) applied to src/server.js`);
console.log(`📦  Backup saved → ${BACKUP}`);
console.log('');
console.log('Notes on skipped/manual items:');
console.log('  #2  GET /me/login-history awardPoints(pool, ...) call is intentionally');
console.log('      outside a transaction (login-history endpoint has no BEGIN/COMMIT).');
console.log('      It is wrapped in try/catch already. No code change needed.');
console.log('  #9  recalculateUserRating role-change risk is a data-integrity concern,');
console.log('      not a code bug. No patch applied — monitor via admin role changes.');
console.log('');
console.log('👉  Restart your server: node src/server.js');