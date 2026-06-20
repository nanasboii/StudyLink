const fs   = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'src', 'server.js');

if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌  src/server.js not found. Run from the project root.');
  process.exit(1);
}

let code = fs.readFileSync(SERVER_PATH, 'utf8');
const hasCRLF = code.includes('\r\n');
code = code.replace(/\r\n/g, '\n');

let fixCount = 0;

function applyFix(label, search, replacement) {
  if (!code.includes(search)) {
    console.warn(`⚠️   Fix skipped (anchor not found): ${label}`);
    return false;
  }
  code = code.replace(search, replacement);
  fixCount++;
  console.log(`✅  Applied: ${label}`);
  return true;
}

// FIX #1
applyFix(
  '#1 Add spotlight_until and has_exclusive_badge columns',
  `        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;`,
  `        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;\n\n      ALTER TABLE users\n        ADD COLUMN IF NOT EXISTS spotlight_until TIMESTAMP;\n\n      ALTER TABLE users\n        ADD COLUMN IF NOT EXISTS has_exclusive_badge BOOLEAN NOT NULL DEFAULT FALSE;`
);

// FIX #2 — note the blank line (\n\n) between .`); and await client.query('COMMIT')
const OLD = `    await createNotification(client, req.auth.user.id, \`You redeemed "\${reward.name}" for \${reward.points_cost} points.\`);\n\n    await client.query('COMMIT');\n    return res.json({\n      message: \`Successfully redeemed "\${reward.name}"!\`,\n      pointsSpent: reward.points_cost,\n      balanceAfter: currentPoints - reward.points_cost`;

const NEW = `    // ── Reward-specific side-effects ─────────────────────────────────────
    const rewardCode = String(reward.code || '').toUpperCase();
    let effectMessage = null;

    switch (rewardCode) {
      case 'PROFILE_SPOTLIGHT': {
        await client.query(
          \`UPDATE users
            SET spotlight_until = GREATEST(COALESCE(spotlight_until, NOW()), NOW()) + INTERVAL '3 days'
            WHERE id = $1\`,
          [req.auth.user.id]
        );
        effectMessage = 'Your profile will be spotlighted for 3 days! 🌟';
        break;
      }
      case 'CUSTOM_BADGE': {
        await client.query(
          \`UPDATE users SET has_exclusive_badge = TRUE WHERE id = $1\`,
          [req.auth.user.id]
        );
        effectMessage = 'Exclusive badge unlocked on your profile! 🏅';
        break;
      }
      case 'PRIORITY_BOOKING': {
        await client.query(
          \`UPDATE users
            SET priority_booking_until = GREATEST(COALESCE(priority_booking_until, NOW()), NOW()) + INTERVAL '7 days'
            WHERE id = $1\`,
          [req.auth.user.id]
        ).catch(() => {});
        effectMessage = 'Priority booking active for 7 days! ⚡';
        break;
      }
      default:
        break;
    }

    await createNotification(
      client,
      req.auth.user.id,
      effectMessage
        ? \`You redeemed "\${reward.name}" for \${reward.points_cost} points. \${effectMessage}\`
        : \`You redeemed "\${reward.name}" for \${reward.points_cost} points.\`
    );

    await client.query('COMMIT');
    return res.json({
      message: effectMessage
        ? \`Successfully redeemed "\${reward.name}"! \${effectMessage}\`
        : \`Successfully redeemed "\${reward.name}"!\`,
      pointsSpent: reward.points_cost,
      balanceAfter: currentPoints - reward.points_cost`;

applyFix('#2 Add reward effect handlers in POST /redeem/:rewardId', OLD, NEW);

if (hasCRLF) code = code.replace(/\n/g, '\r\n');

fs.writeFileSync(SERVER_PATH, code, 'utf8');
console.log(`\n🎉  Done — ${fixCount} fix(es) applied to src/server.js`);