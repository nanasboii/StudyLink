/**
 * fix-server-bugs-v3.js — StudyLink server.js surgical patcher (final pass)
 * Run from project root:  node fix-server-bugs-v3.js
 *
 * Applies 2 remaining open bugs:
 *   #11  Remove old LIMIT-5 /users/me/submitted-reviews duplicate route
 *   #13  POST /quizzes quiz creation — replace raw SQL with awardPoints()
 *        so grantBadges() fires and badge unlocks work for quiz creators
 */

const fs   = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'src', 'server.js');

if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌  src/server.js not found. Run from project root.');
  process.exit(1);
}

let src      = fs.readFileSync(SERVER_PATH, 'utf8');
let changes  = 0;

/* ── helper ─────────────────────────────────────────────────────────────── */
function patch(label, find, replace) {
  const idx = src.indexOf(find);
  if (idx === -1) {
    console.warn(`⚠️   Not found (already fixed or mismatched): ${label}`);
    return;
  }
  src = src.slice(0, idx) + replace + src.slice(idx + find.length);
  changes++;
  console.log(`✅  Applied: ${label}`);
}

/* ── FIX #11 ──────────────────────────────────────────────────────────────
   The old inline route uses a single-line SQL string with LIMIT 5.
   patch.js later injected a proper LIMIT-20 version, so this stub is now
   a dead duplicate that intercepts the route first on some Node versions.
   Replace the entire route block with a comment so the LIMIT-20 one wins.
────────────────────────────────────────────────────────────────────────── */
patch(
  '#11 Remove LIMIT-5 /users/me/submitted-reviews duplicate',
  // exact text as it appears in the live file (one-liner SQL, LIMIT 5)
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
  `// [FIX #11] Old LIMIT-5 /users/me/submitted-reviews route removed.
// The LIMIT-20 canonical route injected by patch.js handles this endpoint.`
);

/* ── FIX #13 ──────────────────────────────────────────────────────────────
   POST /quizzes (quiz creation) awards 10 points via raw SQL, bypassing
   awardPoints() and therefore grantBadges(). Replace with the canonical call.
────────────────────────────────────────────────────────────────────────── */
patch(
  '#13 Use awardPoints() in POST /quizzes quiz creation',
  `    // Award points for creating a quiz
    await client.query(
      \`UPDATE users SET total_points = total_points + 10 WHERE id = $1\`,
      [req.auth.user.id]
    );
    await client.query(
      \`INSERT INTO user_points_log (user_id, points, reason) VALUES ($1, 10, 'Created a quiz')\`,
      [req.auth.user.id]
    );`,
  `    // Award points for creating a quiz — via awardPoints() so grantBadges() fires.
    await awardPoints(client, req.auth.user.id, 10, 'Created a quiz');`
);

/* ── write ───────────────────────────────────────────────────────────────── */
if (changes === 0) {
  console.log('\nℹ️   Nothing to patch — all fixes already applied.');
  process.exit(0);
}

const backup = SERVER_PATH + '.bak3';
fs.copyFileSync(SERVER_PATH, backup);
fs.writeFileSync(SERVER_PATH, src, 'utf8');

console.log(`\n✅  ${changes} fix(es) written to src/server.js`);
console.log(`📦  Backup → ${backup}`);
console.log('\n👉  Restart: node src/server.js');