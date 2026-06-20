/**
 * patch-review-avatar.js
 * Adds u.profile_picture_url AS tutor_profile_picture_url to
 * the GET /users/me/submitted-reviews query so Review.vue can
 * display the tutor's actual profile picture.
 *
 * Run from project root:  node patch-review-avatar.js
 */
const fs   = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'src', 'server.js');
if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌  src/server.js not found. Run from project root.');
  process.exit(1);
}

let code = fs.readFileSync(SERVER_PATH, 'utf8');

// ── Guard ────────────────────────────────────────────────────────────────────
if (code.includes('tutor_profile_picture_url')) {
  console.log('✅  Already patched — tutor_profile_picture_url already present.');
  process.exit(0);
}

// ── There are two known forms of this route (LIMIT-5 inline, LIMIT-20 multi-line).
// Patch both if found.

let patched = false;

// Form A — inline one-liner (LIMIT 5, from original patch.js / bak2)
const OLD_A = `"SELECT br.id, br.booking_id, br.rating, br.comment, br.created_at, b.session_time, u.full_name AS reviewed_user_name FROM booking_reviews br JOIN bookings b ON b.id = br.booking_id JOIN users u ON u.id = CASE WHEN $1 = 'tutor' THEN b.tutee_id ELSE b.tutor_id END WHERE br.reviewer_id = $2 ORDER BY br.created_at DESC LIMIT 5"`;

const NEW_A = `\`SELECT
          br.id,
          br.booking_id,
          br.rating,
          br.comment,
          br.created_at,
          b.session_time,
          u.full_name              AS tutor_name,
          u.profile_picture_url   AS tutor_profile_picture_url
        FROM booking_reviews br
        JOIN bookings b ON b.id = br.booking_id
        JOIN users u ON u.id = CASE
          WHEN $1 = 'tutor' THEN b.tutee_id
          ELSE b.tutor_id
        END
        WHERE br.reviewer_id = $2
        ORDER BY br.created_at DESC
        LIMIT 20\``;

if (code.includes(OLD_A)) {
  code = code.replace(OLD_A, NEW_A);
  patched = true;
  console.log('✅  Patched Form A (inline LIMIT-5 one-liner).');
}

// Form B — multi-line template literal (LIMIT 20, from fix-server-bugs.js injection)
const OLD_B_NEEDLE = 'u.full_name AS reviewed_user_name';
const NEW_B_NEEDLE = `u.full_name              AS tutor_name,
          u.profile_picture_url   AS tutor_profile_picture_url`;

if (code.includes(OLD_B_NEEDLE)) {
  code = code.replace(OLD_B_NEEDLE, NEW_B_NEEDLE);
  patched = true;
  console.log('✅  Patched Form B (multi-line LIMIT-20 version).');
}

if (!patched) {
  console.error('❌  Could not locate the submitted-reviews SQL. Patch manually.');
  process.exit(1);
}

const BACKUP = SERVER_PATH + '.bak-avatar';
fs.copyFileSync(SERVER_PATH, BACKUP);
fs.writeFileSync(SERVER_PATH, code, 'utf8');
console.log(`✅  Done! Backup → ${BACKUP}`);
console.log('👉  Restart your server: node src/server.js');