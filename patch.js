/**
 * patch.js — StudyLink server route injector
 * Run: node patch.js
 * Injects GET /users/me/submitted-reviews before /bookings/:id/cancel
 */
const fs = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'src', 'server.js');

if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌ src/server.js not found. Run from project root.');
  process.exit(1);
}

let code = fs.readFileSync(SERVER_PATH, 'utf8');

// ── Guard: already patched? ──────────────────────────────────────────────────
if (code.includes("'/users/me/submitted-reviews'")) {
  console.log('✅ Route already exists — nothing to patch.');
  process.exit(0);
}

// ── Inject route ─────────────────────────────────────────────────────────────
const ANCHOR = "app.post('/bookings/:id/cancel', requireAuth, async (req, res) => {";

const ROUTE = `app.get('/users/me/submitted-reviews', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      \`SELECT
          br.id,
          br.booking_id,
          br.rating,
          br.comment,
          br.created_at,
          b.session_time,
          u.full_name AS reviewed_user_name
        FROM booking_reviews br
        JOIN bookings b ON b.id = br.booking_id
        JOIN users u ON u.id = CASE
          WHEN $1 = 'tutor' THEN b.tutee_id
          ELSE b.tutor_id
        END
        WHERE br.reviewer_id = $2
        ORDER BY br.created_at DESC
        LIMIT 20\`,
      [req.auth.user.role, req.auth.user.id]
    );
    return res.json({ reviews: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

`;

if (!code.includes(ANCHOR)) {
  // Fallback: inject before last app.listen
  const LISTEN = 'app.listen(';
  if (!code.includes(LISTEN)) {
    console.error('❌ Could not find injection point. Patch manually.');
    process.exit(1);
  }
  const idx = code.lastIndexOf(LISTEN);
  code = code.slice(0, idx) + ROUTE + code.slice(idx);
  console.log('⚠️  Used fallback injection point (before app.listen).');
} else {
  code = code.replace(ANCHOR, ROUTE + ANCHOR);
}

// ── Backup + write ────────────────────────────────────────────────────────────
const BACKUP = SERVER_PATH + '.bak';
fs.copyFileSync(SERVER_PATH, BACKUP);
fs.writeFileSync(SERVER_PATH, code, 'utf8');

console.log(`✅ Patched! Backup saved → ${BACKUP}`);
console.log('👉 Restart your server: node src/server.js');
