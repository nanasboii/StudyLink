const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
require('dotenv').config();

// ── VAPID setup ──────────────────────────────────────────────────────────────
// Generate stable keys once and store in env vars (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
// On first run without env vars, new keys are generated for this process.
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  console.log('⚠  No VAPID keys in env – generated ephemeral keys (push subs will break on restart):');
  console.log('   Public key preview:', vapidKeys.publicKey.slice(0, 16) + '...');
  console.log('   Save generated VAPID keys in environment variables before deploying.');
}
webpush.setVapidDetails(
  'mailto:' + (process.env.ADMIN_EMAIL || 'admin@studylink.local'),
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const hasSmtpCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

function getMailFrom(displayName = 'StudyLink') {
  const smtpFrom = String(process.env.SMTP_FROM || '').trim();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const candidate = smtpFrom || smtpUser;

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate)) {
    return `"${displayName}" <${candidate}>`;
  }

  return `"${displayName}" <noreply@studylink.up.railway.app>`;
}

function getFrontendOrigin(req) {
  const liveOrigin = 'https://studylink.up.railway.app';

  if (process.env.NODE_ENV === 'production' && req) {
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').trim();
    const hostHeader = String(req.headers.host || '').trim();
    const originHeader = String(req.headers.origin || '').trim();
    const candidate = forwardedHost || hostHeader || originHeader;

    if (candidate) {
      const normalizedCandidate = candidate.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!/localhost|127\.0\.0\.1/.test(normalizedCandidate)) {
        return candidate.startsWith('http') ? candidate.replace(/\/$/, '') : `https://${normalizedCandidate}`;
      }
    }
  }

  const configuredOrigin =
    process.env.FRONTEND_ORIGIN ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    liveOrigin;

  const normalizedOrigin = configuredOrigin.replace(/\/$/, '');

  if (/localhost|127\.0\.0\.1/.test(normalizedOrigin)) {
    return liveOrigin;
  }

  return normalizedOrigin;
}

// Test SMTP connection only when credentials are configured.
if (hasSmtpCredentials) {
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP connection error:', error);
    } else {
      console.log('✓ SMTP connection verified and ready for message delivery');
    }
  });
} else {
  console.log('SMTP credentials not configured; email sending is disabled in this environment.');
}

const app = express();
// Use the configured PORT (defaults to 3000 in .env) so the frontend proxy can stay in sync.
const defaultPort = Number(process.env.PORT || 3000);
// Keep retry disabled by default to avoid desync with Vite proxy target in local dev.
// Set PORT_RETRY_COUNT to opt in when running backend without the Vite proxy.
const portRetryCount = Math.max(0, Number(process.env.PORT_RETRY_COUNT || 0));
const sessionHours = Number(process.env.SESSION_DURATION_HOURS || 24);
const streakTimeZone = process.env.STREAK_TIMEZONE || 'Asia/Kuala_Lumpur';
const skipDbInit = String(process.env.SKIP_DB_INIT || '').toLowerCase() === 'true';
const clientBuildDir = path.join(__dirname, '..', 'dist');
const clientBuildIndex = path.join(clientBuildDir, 'index.html');
const legacyPublicDir = path.join(__dirname, 'public');
const legacyClientIndex = path.join(__dirname, '..', 'index.html');
const uploadBaseDir = path.join(__dirname, 'uploads');
const legacyUploadBaseDir = path.join(__dirname, '..', 'uploads');
const verificationUploadDir = path.join(uploadBaseDir, 'verifications');
const resourceUploadDir = path.join(uploadBaseDir, 'resources');
const profilePictureUploadDir = path.join(uploadBaseDir, 'profile-pictures');

const REWARD_RULES_DEFAULT = {
  cooldownDays: 2,
  maxPer30Days: 3,
  maxPerDay: 3
};

const LOGIN_STREAK_DAILY_POINTS = Number(process.env.LOGIN_STREAK_DAILY_POINTS || 3);

const REWARD_RULES_BY_CODE = {
  FREE_SESSION: { cooldownDays: 7, maxPer30Days: 2, maxPerDay: 1 },
  RESOURCE_PACK: { cooldownDays: 3, maxPer30Days: 3, maxPerDay: 1 },
  PRIORITY_BOOKING: { cooldownDays: 14, maxPer30Days: 1, maxPerDay: 1 },
  CAMPUS_VOUCHER: { cooldownDays: 30, maxPer30Days: 1, maxPerDay: 1 },
  PROFILE_SPOTLIGHT: { cooldownDays: 7, maxPer30Days: 2, maxPerDay: 1 }
};

function findUploadedFilePath(folderName, filename) {
  const safeName = path.basename(filename || '');
  if (!safeName) {
    return null;
  }

  const candidates = [
    path.join(uploadBaseDir, folderName, safeName),
    path.join(legacyUploadBaseDir, folderName, safeName)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function removeProfilePictureFile() {
  // No-op: profile pictures are now stored in database, no cleanup needed
}

function startServer(preferredPort) {
  const maxPort = preferredPort + portRetryCount;

  const startOnPort = (portToTry) => {
    const server = app.listen(portToTry, () => {
      const address = server.address();
      const activePort = typeof address === 'object' && address ? address.port : portToTry;
      console.log(`StudyLink API listening on port ${activePort}`);
      console.log(`API: http://localhost:${activePort}`);
      console.log(`API (127.0.0.1): http://127.0.0.1:${activePort}`);
      console.log(`UI: http://localhost:${activePort}/ui`);
      console.log(`UI (127.0.0.1): http://127.0.0.1:${activePort}/ui`);
    });

    server.on('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        if (portToTry < maxPort) {
          const nextPort = portToTry + 1;
          console.warn(`PORT ${portToTry} is in use. Retrying on ${nextPort}...`);
          startOnPort(nextPort);
          return;
        }

        console.error(
          `Unable to bind a free port from ${preferredPort} to ${maxPort}. Stop the process using those ports or change PORT in .env.`
        );
        process.exit(1);
      }

      console.error('Failed to start StudyLink API:', error);
      process.exit(1);
    });
  };

  startOnPort(preferredPort);
}

if (!fs.existsSync(verificationUploadDir)) {
  fs.mkdirSync(verificationUploadDir, { recursive: true });
}

if (!fs.existsSync(resourceUploadDir)) {
  fs.mkdirSync(resourceUploadDir, { recursive: true });
}

if (!fs.existsSync(profilePictureUploadDir)) {
  fs.mkdirSync(profilePictureUploadDir, { recursive: true });
}


// Support both DATABASE_URL (Railway) and individual env vars (local)
const getPoolConfig = () => {
  const sslEnv = String(process.env.DB_SSL || '').toLowerCase();
  const sslRequested = sslEnv === 'true' || sslEnv === '1' || sslEnv === 'yes';
  const sslDisabled = sslEnv === 'false' || sslEnv === '0' || sslEnv === 'no';
  const rejectUnauthorized =
    String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

  if (process.env.DATABASE_URL) {
    const isLocalDatabaseUrl = /localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL);
    const shouldUseSsl = sslRequested || (!sslDisabled && !isLocalDatabaseUrl);

    return {
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSsl
        ? { rejectUnauthorized }
        : false
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'studylink',
    password: process.env.DB_PASSWORD || 'studylink',
    database: process.env.DB_NAME || 'studylink',
    ssl: sslRequested
      ? {
          rejectUnauthorized
        }
      : undefined
  };
};

const pool = new Pool(getPoolConfig());

app.use(express.json({ limit: '2mb' }));

// API routing: strip /api prefix and forward to actual routes
// This handles both development (with Vite proxy) and production (static files + backend)
app.use('/api', (req, res, next) => {
  req.url = req.url.replace(/^\/api/, '');
  next();
});

const hasClientBuild = fs.existsSync(clientBuildIndex);

if (hasClientBuild) {
  // Serve Vue app by default and keep /ui links backward compatible.
  app.use(express.static(clientBuildDir));
  app.use('/ui', express.static(clientBuildDir));
} else {
  // Legacy fallback for development when dist is not built.
  app.use('/ui', express.static(legacyPublicDir));
  app.use(express.static(legacyPublicDir));
}

app.use('/uploads', express.static(uploadBaseDir));
app.use('/uploads', express.static(legacyUploadBaseDir));

function sendClientApp(res) {
  if (fs.existsSync(clientBuildIndex)) {
    return res.sendFile(clientBuildIndex);
  }

  return res.sendFile(legacyClientIndex);
}

app.get('/ui/*', (req, res) => {
  return sendClientApp(res);
});

const allowedVerificationMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg'
]);

const verificationUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, verificationUploadDir),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      cb(null, `verification-${req.auth.user.id}-${unique}${extension}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (allowedVerificationMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF, DOC, DOCX, PNG, and JPEG files are allowed.'));
  }
});

const allowedProfilePictureMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp'
]);

const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (allowedProfilePictureMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PNG, JPEG, GIF, and WEBP images are allowed.'));
  }
});

const allowedResourceMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
  'application/zip'
]);

const resourceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, resourceUploadDir),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      cb(null, `resource-${req.auth.user.id}-${unique}${extension}`);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (allowedResourceMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('File type not allowed. Supported: PDF, DOC, XLS, PPT, TXT, images, audio, video, ZIP'));
  }
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const iterations = 100000;
  const keyLength = 64;
  const digest = 'sha512';
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, keyLength, digest)
    .toString('hex');
  return `${iterations}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [iterationsRaw, salt, original] = String(storedHash).split(':');
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !original) {
    return false;
  }
  const computed = crypto
    .pbkdf2Sync(password, salt, iterations, 64, 'sha512')
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(original), Buffer.from(computed));
}

function sanitizeUser(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    role: row.role,
    major: row.major,
    yearOfStudy: row.year_of_study,
    targetSubjects: row.target_subjects,
    expertise: Array.isArray(row.expertise) ? row.expertise : [],
    bio: row.bio,
    profilePictureUrl: row.profile_picture_url,
    isVerified: row.is_verified,
    rating: Number(row.rating || 0),
    totalPoints: Number(row.total_points || 0),
    loginStreak: Number(row.login_streak || 0),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at
  };
}

function sanitizePublicTutor(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    major: row.major,
    yearOfStudy: row.year_of_study,
    targetSubjects: row.target_subjects,
    expertise: Array.isArray(row.expertise) ? row.expertise : [],
    bio: row.bio,
    profilePictureUrl: row.profile_picture_url,
    isVerified: row.is_verified,
    totalPoints: Number(row.total_points || 0),
    rating: Number(row.rating || 0),
    reviewsReceived: Number(row.reviews_received || 0),
    totalAchievements: Number(row.total_achievements || 0),
    availability: Array.isArray(row.availability) ? row.availability : []
  };
}

function sanitizeLeaderboardEntry(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    profilePictureUrl: row.profile_picture_url,
    totalPoints: Number(row.total_points || 0),
    isVerified: Boolean(row.is_verified),
    rating: Number(row.rating || 0),
    reviewsReceived: Number(row.reviews_received || 0),
    totalAchievements: Number(row.total_achievements || 0)
  };
}

function sanitizeErrorLog(row) {
  return {
    id: row.id,
    path: row.path,
    method: row.method,
    status_code: row.status_code,
    message: row.message,
    created_at: row.created_at,
    user_name: row.user_name || null,
    user_email: row.user_email || null,
    stack: row.stack || null
  };
}

function formatLoginStreakMessage(streakCount) {
  const safeCount = Math.max(1, Number(streakCount || 0));
  return safeCount === 1
    ? 'Your login streak starts today. Come back tomorrow to keep it growing.'
    : `You are on a ${safeCount}-day login streak. Keep the momentum going.`;
}

function dateKeyInTimeZone(dateValue, timeZone = streakTimeZone) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(date);
}

async function createNotification(client, recipientId, message) {
  await client.query(
    `INSERT INTO notifications (recipient_id, message)
     VALUES ($1, $2)`,
    [recipientId, message]
  );

  // Fire push notifications to all subscribed devices (best-effort, non-blocking)
  try {
    const { rows: subs } = await client.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [recipientId]
    );
    const payload = JSON.stringify({ title: 'StudyLink', body: message });
    for (const sub of subs) {
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(() => {}); // ignore individual delivery failures silently
    }
  } catch {
    // Never let push errors break the main notification insert
  }
}

async function logAdminAction(client, adminId, action, targetType, targetId, details = null) {
  await client.query(
    `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [adminId, action, targetType, targetId, details ? JSON.stringify(details) : null]
  );
}

async function recalculateResourceRating(client, resourceId) {
  await client.query(
    `UPDATE resources r
     SET avg_rating = COALESCE(s.avg_rating, 0),
         rating_count = COALESCE(s.rating_count, 0)
     FROM (
       SELECT resource_id, AVG(rating)::numeric(4,2) AS avg_rating, COUNT(*) AS rating_count
       FROM resource_reviews
       WHERE resource_id = $1
       GROUP BY resource_id
     ) s
     WHERE r.id = s.resource_id`,
    [resourceId]
  );

  await client.query(
    `UPDATE resources
     SET avg_rating = 0,
         rating_count = 0
     WHERE id = $1
       AND id NOT IN (SELECT resource_id FROM resource_reviews)`,
    [resourceId]
  );
}

async function getRewardRuleMap(client) {
  let rows = [];
  try {
    const result = await client.query(
      `SELECT reward_code, cooldown_days, max_per_30_days, max_per_day
       FROM point_reward_rules`
    );
    rows = result.rows;
  } catch (error) {
    if (error?.code !== '42P01') {
      throw error;
    }
  }

  const ruleMap = {};
  for (const row of rows) {
    const key = String(row.reward_code || '').toUpperCase();
    if (!key) continue;
    ruleMap[key] = {
      cooldownDays: Number(row.cooldown_days || 0),
      maxPer30Days: Number(row.max_per_30_days || 0),
      maxPerDay: Number(row.max_per_day || 0)
    };
  }

  return ruleMap;
}

function getRewardRule(code, ruleMap = null) {
  const normalizedCode = String(code || '').toUpperCase();
  const fromDb = ruleMap && ruleMap[normalizedCode] ? ruleMap[normalizedCode] : null;
  const fromCodeDefaults = REWARD_RULES_BY_CODE[normalizedCode] || null;

  return {
    ...REWARD_RULES_DEFAULT,
    ...(fromCodeDefaults || {}),
    ...(fromDb || {})
  };
}

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function formatCooldownText(lastRedeemedAt, cooldownDays) {
  if (!lastRedeemedAt || !cooldownDays) {
    return null;
  }

  const cooldownEndsAt = addDays(lastRedeemedAt, cooldownDays);
  const now = new Date();
  if (cooldownEndsAt <= now) {
    return null;
  }

  const msRemaining = cooldownEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return {
    cooldownEndsAt,
    text: daysRemaining > 1 ? `Available again in ${daysRemaining} days.` : 'Available again tomorrow.'
  };
}

async function getUserPointStats(client, userId) {
  const { rows } = await client.query(
    `SELECT u.total_points,
            COALESCE(SUM(CASE WHEN upl.points > 0 THEN upl.points ELSE 0 END), 0) AS earned_points,
            COALESCE(SUM(CASE WHEN upl.points < 0 THEN ABS(upl.points) ELSE 0 END), 0) AS spent_points
     FROM users u
     LEFT JOIN user_points_log upl ON upl.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.total_points`,
    [userId]
  );

  const row = rows[0] || {};
  const availablePoints = Number(row.total_points || 0);
  const earnedPointsFromLog = Number(row.earned_points || 0);
  const spentPoints = Number(row.spent_points || 0);
  const lifetimePoints = Math.max(earnedPointsFromLog, availablePoints + spentPoints, availablePoints);

  return {
    availablePoints,
    earnedPointsFromLog,
    lifetimePoints,
    spentPoints
  };
}

async function getUserRedemptionSnapshot(client, userId, rewardId) {
  const [rewardStatsResult, todayResult] = await Promise.all([
    client.query(
      `SELECT MAX(redeemed_at) AS last_redeemed_at,
              COUNT(*) FILTER (WHERE redeemed_at >= NOW() - INTERVAL '30 days')::int AS redeemed_last_30_days
       FROM redemptions
       WHERE user_id = $1
         AND reward_id = $2`,
      [userId, rewardId]
    ),
    client.query(
      `SELECT COUNT(*)::int AS redeemed_today
       FROM redemptions
       WHERE user_id = $1
         AND redeemed_at >= date_trunc('day', NOW())`,
      [userId]
    )
  ]);

  const rewardStats = rewardStatsResult.rows[0] || {};
  return {
    lastRedeemedAt: rewardStats.last_redeemed_at ? new Date(rewardStats.last_redeemed_at) : null,
    redeemedLast30Days: Number(rewardStats.redeemed_last_30_days || 0),
    redeemedToday: Number(todayResult.rows[0]?.redeemed_today || 0)
  };
}

function evaluateRewardEligibility({ reward, availablePoints, snapshot, ruleMap = null }) {
  const rule = getRewardRule(reward.code, ruleMap);
  const base = {
    rule,
    isEligible: true,
    ineligibilityReason: null,
    cooldownEndsAt: null,
    redeemedLast30Days: snapshot.redeemedLast30Days,
    redeemedToday: snapshot.redeemedToday,
    maxPer30Days: rule.maxPer30Days,
    maxPerDay: rule.maxPerDay,
    cooldownDays: rule.cooldownDays
  };

  if (availablePoints < Number(reward.points_cost || 0)) {
    return {
      ...base,
      isEligible: false,
      ineligibilityReason: `Need ${reward.points_cost - availablePoints} more points.`
    };
  }

  if (rule.maxPerDay && snapshot.redeemedToday >= rule.maxPerDay) {
    return {
      ...base,
      isEligible: false,
      ineligibilityReason: `Daily redemption limit reached (${rule.maxPerDay}/day).`
    };
  }

  if (rule.maxPer30Days && snapshot.redeemedLast30Days >= rule.maxPer30Days) {
    return {
      ...base,
      isEligible: false,
      ineligibilityReason: `Redeem limit reached (${rule.maxPer30Days} in 30 days).`
    };
  }

  const cooldown = formatCooldownText(snapshot.lastRedeemedAt, rule.cooldownDays);
  if (cooldown) {
    return {
      ...base,
      isEligible: false,
      ineligibilityReason: cooldown.text,
      cooldownEndsAt: cooldown.cooldownEndsAt
    };
  }

  return base;
}

async function grantBadges(client, userId) {
  const pointStats = await getUserPointStats(client, userId);
  await client.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT u.id, a.id
     FROM users u
     JOIN achievements a ON $2 >= a.points_required
     LEFT JOIN user_achievements ua
       ON ua.user_id = u.id
      AND ua.achievement_id = a.id
     WHERE u.id = $1
       AND ua.user_id IS NULL`,
    [userId, pointStats.lifetimePoints]
  );
}

async function recalculateUserRating(client, userId) {
  const { rows } = await client.query(
    `SELECT COALESCE(AVG(br.rating), 0)::numeric(4,2) AS avg_rating
     FROM users u
     LEFT JOIN bookings b
       ON (u.role = 'tutor' AND b.tutor_id = u.id)
       OR (u.role = 'tutee' AND b.tutee_id = u.id)
     LEFT JOIN booking_reviews br
       ON br.booking_id = b.id
     LEFT JOIN users reviewer
       ON reviewer.id = br.reviewer_id
      AND ((u.role = 'tutor' AND reviewer.role = 'tutee')
        OR (u.role = 'tutee' AND reviewer.role = 'tutor'))
     WHERE u.id = $1`,
    [userId]
  );

  await client.query(
    `UPDATE users
     SET rating = $2
     WHERE id = $1`,
    [userId, rows[0].avg_rating]
  );
}

async function awardPoints(client, userId, points, reason) {
  if (!points) {
    return;
  }

  const normalizedReason = (() => {
    const text = String(reason || '').toLowerCase();
    if (text.includes('uploaded resource')) return 'resource_upload';
    if (text.includes('verification')) return 'tutor_verification';
    if (text.includes('rated a resource')) return 'resource_review';
    if (text.includes('leaderboard')) return 'leaderboard_rank';
    if (text.includes('booking') || text.includes('session')) return 'booking_progress';
    if (text.includes('login') || text.includes('streak')) return 'login_streak';
    if (text.includes('profile')) return 'profile_update';
    return 'general';
  })();

  await client.query(
    `UPDATE users
     SET total_points = total_points + $2
     WHERE id = $1`,
    [userId, points]
  );

  await client.query(
    `INSERT INTO user_points_log (user_id, points, reason)
     VALUES ($1, $2, $3)`,
    [userId, points, normalizedReason]
  );

  await createNotification(
    client,
    userId,
    `You earned ${points} Learning Points: ${reason}`
  );

  await grantBadges(client, userId);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Missing bearer token.' });
  }

  return pool
    .query(
      `SELECT s.token, s.expires_at, u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1`,
      [token]
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid session token.' });
      }

      const session = rows[0];
      if (new Date(session.expires_at) < new Date()) {
        return pool
          .query('DELETE FROM sessions WHERE token = $1', [token])
          .then(() =>
            res.status(401).json({ message: 'Session expired. Please login again.' })
          );
      }

      req.auth = {
        token,
        user: sanitizeUser(session)
      };
      return next();
    })
    .catch((error) => {
      return res.status(500).json({ message: error.message });
    });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!roles.includes(req.auth.user.role)) {
      return res.status(403).json({ message: 'Insufficient role.' });
    }

    return next();
  };
}

function createRateLimiter({ windowMs, maxRequests, keyPrefix }) {
  const hits = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const item = hits.get(key);

    if (!item || now - item.startedAt > windowMs) {
      hits.set(key, { count: 1, startedAt: now });
      return next();
    }

    if (item.count >= maxRequests) {
      return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
    }

    item.count += 1;
    return next();
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  keyPrefix: 'auth'
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'upload'
});

async function logServerError(req, error) {
  try {
    const requestBody = req.body && typeof req.body === 'object' ? req.body : null;
    await pool.query(
      `INSERT INTO server_error_logs (path, method, status_code, user_id, message, stack, request_body)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        req.originalUrl || req.url || 'unknown',
        req.method || 'UNKNOWN',
        Number(error?.statusCode || error?.status || 500),
        req.auth?.user?.id || null,
        String(error?.message || 'Unexpected server error').slice(0, 1000),
        String(error?.stack || '').slice(0, 4000),
        requestBody ? JSON.stringify(requestBody).slice(0, 4000) : null
      ]
    );
  } catch (loggingError) {
    console.error('Failed to log server error:', loggingError.message);
  }
}

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        phone_number VARCHAR(30),
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('tutee', 'tutor', 'admin')),
        major VARCHAR(120),
        year_of_study INTEGER,
        target_subjects TEXT,
        expertise TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        bio TEXT,
        profile_picture_url TEXT,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        rating NUMERIC(4,2) NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        login_streak INTEGER NOT NULL DEFAULT 0,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS target_subjects TEXT;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS expertise TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

      ALTER TABLE users
        DROP COLUMN IF EXISTS password_reset_token;

      ALTER TABLE users
        DROP COLUMN IF EXISTS two_factor_enabled;

      ALTER TABLE users
        DROP COLUMN IF EXISTS otp_code;

      ALTER TABLE users
        DROP COLUMN IF EXISTS otp_expires_at;

      ALTER TABLE users
        DROP COLUMN IF EXISTS password_reset_expires_at;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_picture BYTEA;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_picture_mime_type VARCHAR(50);

      CREATE TABLE IF NOT EXISTS user_login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        login_date DATE NOT NULL,
        login_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, login_date)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS courses (
        code VARCHAR(30) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        faculty VARCHAR(120),
        semester VARCHAR(30)
      );

      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(30),
        contributor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(250) NOT NULL,
        resource_type VARCHAR(80) NOT NULL,
        file_url TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        avg_rating NUMERIC(4,2) NOT NULL DEFAULT 0,
        rating_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS resource_reviews (
        id SERIAL PRIMARY KEY,
        resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (resource_id, reviewer_id)
      );

      CREATE TABLE IF NOT EXISTS tutor_availability (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code VARCHAR(30),
        day_of_week VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tutee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code VARCHAR(30),
        session_time TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE tutor_availability
        DROP CONSTRAINT IF EXISTS tutor_availability_course_code_fkey;

      ALTER TABLE bookings
        DROP CONSTRAINT IF EXISTS bookings_course_code_fkey;

      CREATE TABLE IF NOT EXISTS booking_reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(120) NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL,
        icon_url TEXT
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, achievement_id)
      );

      ALTER TABLE booking_reviews
        DROP CONSTRAINT IF EXISTS booking_reviews_booking_id_key;

      ALTER TABLE booking_reviews
        DROP CONSTRAINT IF EXISTS booking_reviews_booking_id_reviewer_id_key;

      ALTER TABLE booking_reviews
        ADD CONSTRAINT booking_reviews_booking_id_reviewer_id_key UNIQUE (booking_id, reviewer_id);

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_points_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(80) NOT NULL,
        target_type VARCHAR(80) NOT NULL,
        target_id INTEGER,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS server_error_logs (
        id BIGSERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        method VARCHAR(12) NOT NULL,
        status_code INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        stack TEXT,
        request_body JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tutor_verifications (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code VARCHAR(30),
        proof_url TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'reupload_requested')),
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP
      );

      ALTER TABLE tutor_verifications
        DROP CONSTRAINT IF EXISTS tutor_verifications_status_check;

      ALTER TABLE tutor_verifications
        ADD CONSTRAINT tutor_verifications_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'reupload_requested'));

      CREATE TABLE IF NOT EXISTS point_rewards (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        points_cost INTEGER NOT NULL,
        icon TEXT NOT NULL DEFAULT '🎁',
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS point_reward_rules (
        reward_code VARCHAR(50) PRIMARY KEY REFERENCES point_rewards(code) ON DELETE CASCADE,
        cooldown_days INTEGER NOT NULL CHECK (cooldown_days >= 0),
        max_per_30_days INTEGER NOT NULL CHECK (max_per_30_days > 0),
        max_per_day INTEGER NOT NULL CHECK (max_per_day > 0),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS redemptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id INTEGER NOT NULL REFERENCES point_rewards(id),
        points_spent INTEGER NOT NULL,
        redeemed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        is_support BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_at TIMESTAMP,
        PRIMARY KEY (conversation_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, endpoint)
      );
    `);

    await client.query(
      `WITH seed(code, name, description, points_cost, icon) AS (
         VALUES
           ('FREE_SESSION', 'Free Tutoring Session', 'Redeem for one free 1-hour peer tutoring session with any available tutor.', 80, '📚'),
           ('RESOURCE_PACK', 'Resource Pack Access', 'Unlock an exclusive curated bundle of study materials for your enrolled courses.', 60, '📦'),
           ('PRIORITY_BOOKING', 'Priority Booking', 'Skip the queue — get priority placement when booking a tutor for 7 days.', 100, '⚡'),
           ('CAMPUS_VOUCHER', 'Campus Store Voucher', 'Receive a RM10 voucher redeemable at the campus bookstore or print shop.', 150, '🎟️'),
           ('PROFILE_SPOTLIGHT', 'Profile Spotlight', 'Have your tutor profile highlighted at the top of tutor listings for 3 days.', 40, '🌟')
       ),
       updated AS (
         UPDATE point_rewards r
            SET name = s.name,
                description = s.description,
                points_cost = s.points_cost,
                icon = s.icon
           FROM seed s
          WHERE r.code = s.code
         RETURNING r.code
       ),
       missing AS (
         SELECT s.* FROM seed s
         LEFT JOIN point_rewards r ON r.code = s.code
         WHERE r.code IS NULL
       )
       INSERT INTO point_rewards (code, name, description, points_cost, icon)
       SELECT code, name, description, points_cost, icon FROM missing`
    );

    await client.query(
      `WITH seed(reward_code, cooldown_days, max_per_30_days, max_per_day) AS (
         VALUES
           ('FREE_SESSION', 7, 2, 1),
           ('RESOURCE_PACK', 3, 3, 1),
           ('PRIORITY_BOOKING', 14, 1, 1),
           ('CAMPUS_VOUCHER', 30, 1, 1),
           ('PROFILE_SPOTLIGHT', 7, 2, 1)
       ),
       missing AS (
         SELECT s.*
         FROM seed s
         JOIN point_rewards pr ON pr.code = s.reward_code
         LEFT JOIN point_reward_rules rr ON rr.reward_code = s.reward_code
         WHERE rr.reward_code IS NULL
       )
       INSERT INTO point_reward_rules (reward_code, cooldown_days, max_per_30_days, max_per_day)
       SELECT reward_code, cooldown_days, max_per_30_days, max_per_day
       FROM missing`
    );

    await client.query(
      `WITH seed(code, name, description, points_required, icon_url) AS (
         VALUES
           ('POINTS_15', 'First Steps', 'Reached 15 points by getting active on StudyLink.', 15, '/ui/assets/badges/first-steps.svg'),
           ('POINTS_50', 'Helping Hand', 'Reached 50 points by consistently helping classmates.', 50, '/ui/assets/badges/helping-hand.svg'),
           ('POINTS_100', 'Campus Mentor', 'Reached 100 points through tutoring, reviews, and resource sharing.', 100, '/ui/assets/badges/campus-mentor.svg'),
           ('POINTS_175', 'Community Builder', 'Reached 175 points by staying active across StudyLink.', 175, '/ui/assets/badges/community-builder.svg'),
          ('POINTS_250', 'StudyLink Champion', 'Reached 250 points as one of the most active members.', 250, '/ui/assets/badges/studylink-champion.svg'),
          ('WELCOME_ABOARD', 'Welcome Aboard', 'Completed your first activity on StudyLink. Every great journey starts with a single step!', 5, '/ui/assets/badges/welcome-aboard.svg'),
          ('RISING_STAR', 'Rising Star', 'Earned 350 points through consistent contributions to the StudyLink community.', 350, '/ui/assets/badges/rising-star.svg'),
          ('KNOWLEDGE_TITAN', 'Knowledge Titan', 'Accumulated 500 points by sharing knowledge and empowering peers to learn.', 500, '/ui/assets/badges/knowledge-titan.svg'),
          ('ELITE_SCHOLAR', 'Elite Scholar', 'Reached 750 points — a mark of exceptional dedication to learning and teaching.', 750, '/ui/assets/badges/elite-scholar.svg'),
          ('STUDYLINK_LEGEND', 'StudyLink Legend', 'Amassed 1000 points and earned legendary status among StudyLink''s top contributors.', 1000, '/ui/assets/badges/studylink-legend.svg')
       ),
       updated AS (
         UPDATE achievements a
            SET name = s.name,
                description = s.description,
                points_required = s.points_required,
                icon_url = s.icon_url
           FROM seed s
          WHERE a.code = s.code
         RETURNING a.code
       ),
       missing AS (
         SELECT s.*
           FROM seed s
      LEFT JOIN achievements a ON a.code = s.code
          WHERE a.code IS NULL
       ),
       numbered AS (
         SELECT
           ROW_NUMBER() OVER (ORDER BY code) + COALESCE((SELECT MAX(id) FROM achievements), 0) AS id,
           code,
           name,
           description,
           points_required,
           icon_url
           FROM missing
       )
       INSERT INTO achievements (id, code, name, description, points_required, icon_url)
       SELECT id, code, name, description, points_required, icon_url
         FROM numbered`
    );

    await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       WITH point_totals AS (
         SELECT u.id AS user_id,
                GREATEST(
                  u.total_points + COALESCE(SUM(CASE WHEN upl.points < 0 THEN ABS(upl.points) ELSE 0 END), 0),
                  COALESCE(SUM(CASE WHEN upl.points > 0 THEN upl.points ELSE 0 END), 0),
                  u.total_points
                )::int AS lifetime_points
         FROM users u
         LEFT JOIN user_points_log upl ON upl.user_id = u.id
         GROUP BY u.id, u.total_points
       )
       SELECT pt.user_id, a.id
       FROM point_totals pt
       JOIN achievements a ON pt.lifetime_points >= a.points_required
       LEFT JOIN user_achievements ua
         ON ua.user_id = pt.user_id
        AND ua.achievement_id = a.id
       WHERE ua.user_id IS NULL`
    );

    await client.query(
      `INSERT INTO courses (code, name, faculty, semester)
       VALUES
         ('TMF3953', 'Distributed Systems', 'Computer Science and IT', 'Semester 2'),
         ('TMF3963', 'Computer Graphics', 'Computer Science and IT', 'Semester 2'),
         ('TMF3973', 'Database Systems', 'Computer Science and IT', 'Semester 1')
       ON CONFLICT (code) DO NOTHING`
    );

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@studylink.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = hashPassword(adminPassword);

    await client.query(
      `INSERT INTO users (student_id, full_name, email, password_hash, role, is_verified)
       VALUES ('ADMIN-001', 'StudyLink Admin', $1, $2, 'admin', TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail, adminPasswordHash]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Serve web UI at root (no redirect). Keep API metadata available at '/api' if needed.
app.get('/', (req, res) => {
  return sendClientApp(res);
});

async function handleHealth(req, res) {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({
      status: 'ok',
      database: 'connected',
      serverTime: result.rows[0].server_time
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error.message
    });
  }
}

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

  app.post('/test-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'email is required.' });
    }

    try {
      console.log(`Sending test email to ${email}...`);
      const info = await transporter.sendMail({
        from: getMailFrom('StudyLink Security'),
        to: email,
        subject: 'StudyLink Test Email',
        text: 'This is a test email from StudyLink. If you received this, your email configuration is working correctly!',
        html: '<p>This is a test email from StudyLink.</p><p>If you received this, your email configuration is working correctly!</p>'
      });
      console.log(`✓ Test email sent successfully. Message ID: ${info.messageId}`);
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: info.messageId
      });
    } catch (error) {
      console.error(`✗ Error sending test email to ${email}:`, error.message);
      console.error('Full error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message
      });
    }
  });

app.post('/auth/register', authRateLimiter, async (req, res) => {
  const {
    studentId,
    fullName,
    email,
    phoneNumber,
    password,
    role,
    major,
    yearOfStudy,
    targetSubjects,
    expertise,
    bio
  } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({
      message: 'fullName, email, password, and role are required.'
    });
  }

  if (!['tutee', 'tutor'].includes(role)) {
    return res.status(400).json({ message: 'role must be tutee or tutor.' });
  }

  try {
    const passwordHash = hashPassword(password);

    const { rows } = await pool.query(
      `INSERT INTO users
       (student_id, full_name, email, phone_number, password_hash, role, major, year_of_study, target_subjects, expertise, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        studentId || null,
        fullName,
        email.toLowerCase(),
        phoneNumber || null,
        passwordHash,
        role,
        major || null,
        yearOfStudy || null,
        targetSubjects || null,
        role === 'tutor' && Array.isArray(expertise)
          ? expertise.filter((item) => String(item).trim()).map((item) => String(item).trim())
          : [],
        bio || null,
        role === 'tutee'
      ]
    );

    return res.status(201).json({
      message: 'Registration successful.',
      user: sanitizeUser(rows[0])
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email or student ID already exists.' });
    }
    return res.status(500).json({ message: error.message });
  }
});

app.post('/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  let client;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM users WHERE email = $1 FOR UPDATE', [
      email.toLowerCase()
    ]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      await client.query('ROLLBACK');
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const now = new Date();
    const previousLoginAt = user.last_login_at ? new Date(user.last_login_at) : null;
    const previousLoginDate = previousLoginAt ? dateKeyInTimeZone(previousLoginAt) : '';
    const today = dateKeyInTimeZone(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = dateKeyInTimeZone(yesterday);
    const previousStreak = Number(user.login_streak || 0);

    let nextStreak = 1;
    if (previousLoginDate === today) {
      nextStreak = previousStreak || 1;
    } else if (previousLoginDate === yesterdayDate) {
      nextStreak = previousStreak + 1;
    }

    const shouldShowStreak = previousLoginDate !== today;
    const streakPointsAwarded = shouldShowStreak ? Math.max(0, LOGIN_STREAK_DAILY_POINTS) : 0;

    if (previousLoginDate) {
      await client.query(
        `INSERT INTO user_login_history (user_id, login_date, login_at)
         VALUES ($1, $2::date, $3)
         ON CONFLICT (user_id, login_date)
         DO UPDATE SET login_at = EXCLUDED.login_at`,
        [user.id, previousLoginDate, previousLoginAt || now]
      );
    }

    await client.query(
      `INSERT INTO user_login_history (user_id, login_date, login_at)
       VALUES ($1, $2::date, $3)
       ON CONFLICT (user_id, login_date)
       DO UPDATE SET login_at = EXCLUDED.login_at`,
      [user.id, today, now]
    );

    const { rows: updatedRows } = await client.query(
      `UPDATE users
       SET login_streak = $1,
           last_login_at = $2
       WHERE id = $3
       RETURNING *`,
      [nextStreak, now, user.id]
    );

    if (streakPointsAwarded > 0) {
      await awardPoints(client, user.id, streakPointsAwarded, 'Daily login streak check-in');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, user.id, expiresAt]
    );

    const { rows: historyRows } = await client.query(
      `SELECT login_date::text AS login_date
       FROM user_login_history
       WHERE user_id = $1
       ORDER BY login_date DESC
       LIMIT 120`,
      [user.id]
    );

    await client.query('COMMIT');

    const updatedUser = updatedRows[0] || { ...user, login_streak: nextStreak, last_login_at: now };
    const responseUser = {
      ...updatedUser,
      total_points: Number(updatedUser.total_points || 0) + streakPointsAwarded
    };

    return res.json({
      message: 'Login successful.',
      token,
      expiresAt,
      loginStreak: {
        count: nextStreak,
        shouldShow: shouldShowStreak,
        message: formatLoginStreakMessage(nextStreak),
        pointsAwarded: streakPointsAwarded,
        lastLoginAt: now,
        historyDates: historyRows.map((row) => row.login_date)
      },
      user: sanitizeUser(responseUser)
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback failures and return the original error.
      }
    }
    return res.status(500).json({ message: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE token = $1', [req.auth.token]);
    return res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/auth/change-password', requireAuth, authRateLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.auth.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = rows[0];
    const isPasswordValid = comparePassword(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const newHash = hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/auth/delete-account', requireAuth, authRateLimiter, async (req, res) => {
  const { password } = req.body;
  const userId = req.auth.user.id;

  if (!password) {
    return res.status(400).json({ message: 'password is required.' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = rows[0];
    const isPasswordValid = comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password is incorrect.' });
    }

    // Delete associated data
    await pool.query('DELETE FROM user_login_history WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.auth.user });
});

app.get('/me/login-history', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const today = dateKeyInTimeZone(now);
    const user = req.auth.user;
    
    const previousLoginAt = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const previousLoginDate = previousLoginAt && !Number.isNaN(previousLoginAt.getTime())
        ? dateKeyInTimeZone(previousLoginAt)
        : '';

    let currentStreak = Number(user.loginStreak || 0);

    let streakPointsAwarded = 0;

    if (previousLoginDate !== today) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = dateKeyInTimeZone(yesterday);

      if (previousLoginDate === yesterdayDate) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }

      await pool.query(
        `INSERT INTO user_login_history (user_id, login_date, login_at)
         VALUES ($1, $2::date, $3)
         ON CONFLICT (user_id, login_date)
         DO UPDATE SET login_at = EXCLUDED.login_at`,
        [user.id, today, now]
      );

      await pool.query(
        `UPDATE users
         SET login_streak = $1,
             last_login_at = $2
         WHERE id = $3`,
        [currentStreak, now, user.id]
      );

      streakPointsAwarded = Math.max(0, LOGIN_STREAK_DAILY_POINTS);
      if (streakPointsAwarded > 0) {
        await awardPoints(pool, user.id, streakPointsAwarded, 'Daily login streak check-in');
      }

      user.loginStreak = currentStreak;
      user.lastLoginAt = now;
    }

    const { rows } = await pool.query(
      `SELECT login_date::text AS login_date
       FROM user_login_history
       WHERE user_id = $1
       ORDER BY login_date DESC
       LIMIT 120`,
      [user.id]
    );

    return res.json({
      historyDates: rows.map((row) => row.login_date),
      count: currentStreak,
      lastLoginAt: user.lastLoginAt,
      pointsAwarded: streakPointsAwarded
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.put('/me/profile', requireAuth, async (req, res) => {
  const {
    fullName,
    phoneNumber,
    major,
    yearOfStudy,
    targetSubjects,
    expertise,
    bio,
    profilePictureUrl,
    removeProfilePicture
  } = req.body;

  const nextProfilePictureUrl =
    typeof profilePictureUrl === 'string' && profilePictureUrl.trim()
      ? profilePictureUrl.trim()
      : null;
  const wantsProfilePictureRemoval = Boolean(removeProfilePicture);

  if (
    nextProfilePictureUrl &&
    !nextProfilePictureUrl.startsWith('/profile-picture/')
  ) {
    return res.status(400).json({ message: 'Invalid profile picture URL.' });
  }

  const normalizedExpertise =
    req.auth.user.role === 'tutor' && Array.isArray(expertise)
      ? expertise.filter((item) => String(item).trim()).map((item) => String(item).trim())
      : null;

  let updatedUser = null;

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($2, full_name),
           phone_number = COALESCE($3, phone_number),
           major = COALESCE($4, major),
           year_of_study = COALESCE($5, year_of_study),
           target_subjects = COALESCE($6, target_subjects),
           expertise = COALESCE($7, expertise),
           bio = COALESCE($8, bio),
           profile_picture_url = CASE
             WHEN $10 THEN NULL
             WHEN $9::text IS NOT NULL THEN $9::text
             ELSE profile_picture_url
           END
       WHERE id = $1
       RETURNING *`,
      [
        req.auth.user.id,
        fullName,
        phoneNumber,
        major,
        yearOfStudy,
        targetSubjects,
        normalizedExpertise,
        bio,
        nextProfilePictureUrl,
        wantsProfilePictureRemoval
      ]
    );

    updatedUser = rows[0];

    const previousProfilePictureUrl = req.auth.user.profile_picture_url;
    const currentProfilePictureUrl = updatedUser.profile_picture_url;
    if (
      previousProfilePictureUrl &&
      previousProfilePictureUrl !== currentProfilePictureUrl
    ) {
      await removeProfilePictureFile(previousProfilePictureUrl);
    }
  } catch (error) {
    if (nextProfilePictureUrl) {
      await removeProfilePictureFile(nextProfilePictureUrl);
    }
    return res.status(500).json({ message: error.message });
  }

  try {
    await awardPoints(pool, req.auth.user.id, 5, 'Profile updated');
  } catch (pointsError) {
    // Profile update should remain successful even if points/notification side effects fail.
    console.error('Profile update side effect failed:', pointsError.message);
  }

  const { rows: refreshedRows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [req.auth.user.id]
  );

  return res.json({
    message: 'Profile updated.',
    user: sanitizeUser(refreshedRows[0] || updatedUser)
  });
});

app.post(
  '/uploads/profile-picture',
  uploadRateLimiter,
  requireAuth,
  (req, res, next) => {
    profilePictureUpload.single('image')(req, res, (error) => {
      if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Image is too large. Max size is 5MB.' });
        }
        return res.status(400).json({ message: error.message });
      }
      return next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'image file is required.' });
    }

    try {
      await pool.query(
        `UPDATE users SET profile_picture = $1, profile_picture_mime_type = $2 WHERE id = $3`,
        [req.file.buffer, req.file.mimetype, req.auth.user.id]
      );

      const fileUrl = `/profile-picture/${req.auth.user.id}`;
      return res.status(201).json({ fileUrl });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

app.get('/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      'SELECT profile_picture, profile_picture_mime_type FROM users WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = rows[0];
    if (!user.profile_picture) {
      return res.status(404).json({ message: 'Profile picture not found.' });
    }

    res.set('Content-Type', user.profile_picture_mime_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    return res.send(user.profile_picture);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.put('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: 'currentPassword and newPassword are required.'
    });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [
      req.auth.user.id
    ]);

    const user = rows[0];
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const nextHash = hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
      req.auth.user.id,
      nextHash
    ]);

    return res.json({ message: 'Password updated.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.delete('/me', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.auth.user.id]);
    return res.json({ message: 'Account deleted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/courses', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM courses ORDER BY code');
    return res.json({ courses: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    try {
      const { rows } = await pool.query(
        `SELECT u.id,
                u.full_name,
                u.role,
                u.profile_picture_url,
                u.total_points,
                u.is_verified,
                COALESCE(u.rating, 0) AS rating,
                COALESCE(rc.reviews_received, 0) AS reviews_received,
                COALESCE(ua.total_achievements, 0) AS total_achievements
         FROM users u
         LEFT JOIN (
           SELECT reviewed_user_id, COUNT(*)::int AS reviews_received
           FROM booking_reviews br
           JOIN bookings b ON b.id = br.booking_id
           JOIN users reviewer ON reviewer.id = br.reviewer_id
           CROSS JOIN LATERAL (
             SELECT CASE
               WHEN reviewer.role = 'tutor' THEN b.tutee_id
               WHEN reviewer.role = 'tutee' THEN b.tutor_id
             END AS reviewed_user_id
           ) reviewed
           WHERE reviewer.role IN ('tutor', 'tutee')
             AND reviewed.reviewed_user_id IS NOT NULL
           GROUP BY reviewed.reviewed_user_id
         ) rc ON rc.reviewed_user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*)::int AS total_achievements
           FROM user_achievements
           GROUP BY user_id
         ) ua ON ua.user_id = u.id
         WHERE u.role != 'admin'
         ORDER BY COALESCE(ua.total_achievements, 0) DESC,
                  u.total_points DESC,
                  COALESCE(rc.reviews_received, 0) DESC,
                  u.full_name ASC
         LIMIT 20`
      );

      return res.json({ leaderboard: rows.map((row) => sanitizeLeaderboardEntry(row)) });
    } catch (innerErr) {
      // If the booking_reviews (or bookings) relation is missing on the imported DB,
      // fall back to a simpler leaderboard that omits reviews_received.
      if (String(innerErr.message || '').toLowerCase().includes('booking_reviews') ||
          String(innerErr.message || '').toLowerCase().includes('relation') && String(innerErr.message || '').toLowerCase().includes('does not exist')) {
        console.warn('Leaderboard: booking_reviews not available, using fallback query. Error:', innerErr.message);

        const { rows } = await pool.query(
          `SELECT u.id,
                  u.full_name,
                  u.role,
                  u.profile_picture_url,
                  u.total_points,
                  u.is_verified,
                  COALESCE(u.rating, 0) AS rating,
                  0 AS reviews_received,
                  COALESCE(ua.total_achievements, 0) AS total_achievements
           FROM users u
           LEFT JOIN (
             SELECT user_id, COUNT(*)::int AS total_achievements
             FROM user_achievements
             GROUP BY user_id
           ) ua ON ua.user_id = u.id
           WHERE u.role != 'admin'
           ORDER BY COALESCE(ua.total_achievements, 0) DESC,
                    u.total_points DESC,
                    u.full_name ASC
           LIMIT 20`
        );

        return res.json({ leaderboard: rows.map((row) => sanitizeLeaderboardEntry(row)) });
      }

      throw innerErr;
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/users/:id/public', requireAuth, async (req, res) => {
  const rawId = String(req.params.id || '').trim();
  if (!rawId) {
    return res.status(400).json({ message: 'User id is required.' });
  }

  try {
    const { rows } = await pool.query(
            `SELECT u.id,
              u.full_name,
              u.role,
              u.major,
              u.year_of_study,
              u.target_subjects,
              u.expertise,
              u.bio,
              u.profile_picture_url,
              u.is_verified,
              u.total_points,
              COALESCE(u.rating, 0) AS rating,
              COALESCE(rc.reviews_received, 0) AS reviews_received,
              COALESCE(ua.total_achievements, 0) AS total_achievements
       FROM users u
       LEFT JOIN (
         SELECT reviewed_user_id, COUNT(*)::int AS reviews_received
         FROM booking_reviews br
         JOIN bookings b ON b.id = br.booking_id
         JOIN users reviewer ON reviewer.id = br.reviewer_id
         CROSS JOIN LATERAL (
           SELECT CASE
             WHEN reviewer.role = 'tutor' THEN b.tutee_id
             WHEN reviewer.role = 'tutee' THEN b.tutor_id
           END AS reviewed_user_id
         ) reviewed
         WHERE reviewer.role IN ('tutor', 'tutee')
           AND reviewed.reviewed_user_id IS NOT NULL
         GROUP BY reviewed.reviewed_user_id
       ) rc ON rc.reviewed_user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS total_achievements
         FROM user_achievements
         GROUP BY user_id
       ) ua ON ua.user_id = u.id
       WHERE u.id::text = $1
       LIMIT 1`,
      [rawId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: sanitizePublicTutor(rows[0]) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/availability', requireAuth, requireRole('tutor'), async (req, res) => {
  const { courseCode, dayOfWeek, startTime, endTime } = req.body;
  const normalizedCourseCode = courseCode
    ? String(courseCode).trim().toUpperCase()
    : null;

  if (!dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({
      message: 'dayOfWeek, startTime and endTime are required.'
    });
  }

  if (startTime >= endTime) {
    return res.status(400).json({
      message: 'startTime must be earlier than endTime.'
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tutor_availability
       (tutor_id, course_code, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.auth.user.id, normalizedCourseCode, dayOfWeek, startTime, endTime]
    );

    return res.status(201).json({ availability: rows[0] });
  } catch (error) {
    console.error('Availability insert failed:', {
      userId: req.auth?.user?.id,
      payload: { courseCode: normalizedCourseCode, dayOfWeek, startTime, endTime },
      code: error.code,
      message: error.message
    });

    if (error.code === '22P02') {
      return res.status(400).json({ message: 'Invalid time value supplied.' });
    }

    if (error.code === '28P01' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection issue. Please try again.' });
    }

    return res.status(500).json({ message: 'Failed to update session availability.' });
  }
});

app.get('/availability/me', requireAuth, requireRole('tutor'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM tutor_availability
       WHERE tutor_id = $1
       ORDER BY day_of_week, start_time`,
      [req.auth.user.id]
    );

    return res.json({ availability: rows });
  } catch (error) {
    console.error('Availability fetch failed:', {
      userId: req.auth?.user?.id,
      code: error.code,
      message: error.message
    });

    if (error.code === '28P01' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Database connection issue. Please try again.' });
    }

    return res.status(500).json({ message: 'Failed to load tutor availability.' });
  }
});

app.get('/tutors', requireAuth, async (req, res) => {
  const courseCode = req.query.courseCode
    ? String(req.query.courseCode).trim().toUpperCase()
    : null;

  try {
    const { rows } = await pool.query(
      `WITH availability_agg AS (
         SELECT ta.tutor_id,
                json_agg(
                  json_build_object(
                    'courseCode', ta.course_code,
                    'dayOfWeek', ta.day_of_week,
                    'startTime', to_char(ta.start_time, 'HH24:MI'),
                    'endTime', to_char(ta.end_time, 'HH24:MI')
                  )
                  ORDER BY ta.day_of_week, ta.start_time
                ) AS availability
         FROM tutor_availability ta
         WHERE ($1::text IS NULL OR ta.course_code = $1)
           AND NOT EXISTS (
             SELECT 1
             FROM bookings b
             WHERE b.tutor_id = ta.tutor_id
               AND b.status = 'accepted'
               AND b.session_time >= NOW()
               AND LOWER(TRIM(TO_CHAR(b.session_time, 'Day'))) = LOWER(ta.day_of_week)
               AND b.session_time::time >= ta.start_time
               AND b.session_time::time < ta.end_time
           )
         GROUP BY ta.tutor_id
       )
       SELECT u.id,
              u.full_name,
              u.role,
              u.major,
              u.year_of_study,
              u.target_subjects,
              u.expertise,
              u.bio,
              u.profile_picture_url,
              u.rating,
              u.total_points,
              u.is_verified,
              COALESCE(a.availability, '[]'::json) AS availability
       FROM users u
       LEFT JOIN availability_agg a ON a.tutor_id = u.id
       WHERE u.role = 'tutor'
         AND ($1::text IS NULL OR a.tutor_id IS NOT NULL)
       ORDER BY u.is_verified DESC, u.rating DESC, u.total_points DESC, u.full_name ASC`,
      [courseCode]
    );

    return res.json({ tutors: rows.map((row) => sanitizePublicTutor(row)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/bookings', requireAuth, requireRole('tutee'), async (req, res) => {
  const { tutorId, courseCode, sessionTime, notes } = req.body;
  const normalizedCourseCode = courseCode ? String(courseCode).trim().toUpperCase() : null;

  if (!tutorId || !sessionTime) {
    return res.status(400).json({
      message: 'tutorId and sessionTime are required.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tutorLookup = await client.query(
      `SELECT id, full_name
       FROM users
       WHERE role = 'tutor'
         AND (student_id = $1 OR id::text = $1)
       LIMIT 1`,
      [String(tutorId).trim()]
    );

    if (tutorLookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Tutor not found. Use the matric number shown on the tutor page.'
      });
    }

    const tutor = tutorLookup.rows[0];

    const { rows } = await client.query(
      `INSERT INTO bookings (tutor_id, tutee_id, course_code, session_time, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tutor.id, req.auth.user.id, normalizedCourseCode, sessionTime, notes || null]
    );

    await createNotification(
      client,
      tutor.id,
      `New tutoring booking request from ${req.auth.user.fullName}.`
    );

    await client.query('COMMIT');
    return res.status(201).json({ booking: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.get('/bookings/inbox', requireAuth, async (req, res) => {
  const filterColumn = req.auth.user.role === 'tutor' ? 'tutor_id' : 'tutee_id';

  try {
    const { rows } = await pool.query(
      `SELECT b.*,
              t.full_name AS tutor_name,
              te.full_name AS tutee_name
       FROM bookings b
       JOIN users t ON t.id = b.tutor_id
       JOIN users te ON te.id = b.tutee_id
       WHERE b.${filterColumn} = $1
       ORDER BY b.session_time DESC`,
      [req.auth.user.id]
    );

    return res.json({ bookings: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/bookings/:id/decision', requireAuth, requireRole('tutor'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const { decision } = req.body;

  if (!['accepted', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be accepted or rejected.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE bookings
       SET status = $1
       WHERE id = $2
         AND tutor_id = $3
         AND status = 'pending'
       RETURNING *`,
      [decision, bookingId, req.auth.user.id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Pending booking not found.' });
    }

    const booking = rows[0];

    await createNotification(
      client,
      booking.tutee_id,
      `Your booking #${booking.id} was ${decision}.`
    );

    if (decision === 'accepted') {
      await awardPoints(client, req.auth.user.id, 10, 'Accepted tutoring booking');
    }

    await client.query('COMMIT');
    return res.json({ booking });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post('/bookings/:id/complete', requireAuth, requireRole('tutor'), async (req, res) => {
  const bookingId = Number(req.params.id);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE bookings
       SET status = 'completed'
       WHERE id = $1
         AND tutor_id = $2
         AND status = 'accepted'
       RETURNING *`,
      [bookingId, req.auth.user.id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ message: 'Accepted booking not found for this tutor.' });
    }

    const booking = rows[0];

    await awardPoints(client, req.auth.user.id, 20, 'Completed tutoring session');
    await createNotification(
      client,
      booking.tutee_id,
      `Tutoring session #${booking.id} is marked complete. Please leave a review.`
    );

    await client.query('COMMIT');
    return res.json({ booking });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post('/bookings/:id/review', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  const { rating, comment } = req.body;

  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ message: 'rating must be between 1 and 5.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT *
       FROM bookings
       WHERE id = $1
         AND status = 'completed'`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Completed booking not found.' });
    }

    const booking = bookingResult.rows[0];
    if (![booking.tutee_id, booking.tutor_id].includes(req.auth.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Not part of this booking.' });
    }

    if (!['tutor', 'tutee'].includes(req.auth.user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only tutors and tutees can submit reviews.' });
    }

    const reviewedUserId =
      req.auth.user.role === 'tutor' ? booking.tutee_id : booking.tutor_id;

    if (!['tutor', 'tutee'].includes(req.auth.user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only tutors and tutees can submit reviews.' });
    }

    await client.query(
      `INSERT INTO booking_reviews (booking_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (booking_id, reviewer_id)
       DO UPDATE SET reviewer_id = EXCLUDED.reviewer_id,
                     rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment`,
      [bookingId, req.auth.user.id, rating, comment || null]
    );

    await recalculateUserRating(client, reviewedUserId);

    await awardPoints(client, req.auth.user.id, 8, 'Submitted tutoring session review');

    await client.query('COMMIT');
    return res.json({ message: 'Review submitted.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.get('/bookings/:id/reviews', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);

  try {
    const bookingResult = await pool.query(
      `SELECT *
       FROM bookings
       WHERE id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];
    if (
      req.auth.user.role !== 'admin' &&
      ![booking.tutor_id, booking.tutee_id].includes(req.auth.user.id)
    ) {
      return res.status(403).json({ message: 'Not allowed to view these reviews.' });
    }

    const { rows } = await pool.query(
      `SELECT br.id,
              br.booking_id,
              br.reviewer_id,
              br.rating,
              br.comment,
              br.created_at,
              u.full_name AS reviewer_name,
              u.role AS reviewer_role
       FROM booking_reviews br
       JOIN users u ON u.id = br.reviewer_id
       WHERE br.booking_id = $1
       ORDER BY br.created_at DESC`,
      [bookingId]
    );

    return res.json({ reviews: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lookup = await client.query(
      `SELECT *
       FROM bookings
       WHERE id = $1`,
      [bookingId]
    );

    if (lookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = lookup.rows[0];
    const isParticipant = [booking.tutor_id, booking.tutee_id].includes(req.auth.user.id);
    if (!isParticipant && req.auth.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Not allowed to cancel this booking.' });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only pending or accepted bookings can be cancelled.' });
    }

    const updated = await client.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    const otherPartyId =
      req.auth.user.id === booking.tutor_id ? booking.tutee_id : booking.tutor_id;
    await createNotification(
      client,
      otherPartyId,
      `Booking #${bookingId} was cancelled by ${req.auth.user.fullName}.`
    );

    await client.query('COMMIT');
    return res.json({ booking: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post('/resources', requireAuth, async (req, res) => {
  const { courseCode, title, resourceType, fileUrl, metadata } = req.body;

  if (!title || !resourceType || !fileUrl) {
    return res.status(400).json({
      message: 'title, resourceType and fileUrl are required.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO resources
       (course_code, contributor_id, title, resource_type, file_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        courseCode || null,
        req.auth.user.id,
        title,
        resourceType,
        fileUrl,
        metadata || {}
      ]
    );

    await awardPoints(client, req.auth.user.id, 15, 'Uploaded resource');

    await client.query('COMMIT');
    return res.status(201).json({ resource: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post(
  '/resources/upload',
  uploadRateLimiter,
  requireAuth,
  (req, res, next) => {
    resourceUpload.single('resourceFile')(req, res, (error) => {
      if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Max size is 25MB.' });
        }
        return res.status(400).json({ message: error.message });
      }
      return next();
    });
  },
  async (req, res) => {
    const courseCode = req.body.courseCode ? String(req.body.courseCode).trim().toUpperCase() : null;
    const title = String(req.body.title || '').trim();
    const resourceType = String(req.body.resourceType || '').trim();
    const resourceLink = String(req.body.resourceLink || '').trim();

    if (!title || !resourceType) {
      if (req.file) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') {
            console.error('Resource upload cleanup failed:', cleanupError.message);
          }
        }
      }

      return res.status(400).json({ message: 'title and resourceType are required.' });
    }

    const resourceUrl = req.file
      ? `/uploads/resources/${req.file.filename}`
      : resourceLink;

    if (!resourceUrl) {
      return res.status(400).json({ message: 'Upload a file or paste a resource link.' });
    }

    const metadata = {
      uploadKind: req.file ? 'file' : 'link',
      originalName: req.file ? req.file.originalname : null,
      fileName: req.file ? req.file.filename : null,
      externalLink: req.file ? null : resourceLink
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO resources
         (course_code, contributor_id, title, resource_type, file_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [courseCode || null, req.auth.user.id, title, resourceType, resourceUrl, metadata]
      );

      await awardPoints(client, req.auth.user.id, 15, 'Uploaded resource');

      await client.query('COMMIT');
      return res.status(201).json({ resource: rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      if (req.file) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') {
            console.error('Resource upload cleanup failed:', cleanupError.message);
          }
        }
      }
      return res.status(500).json({ message: error.message });
    } finally {
      client.release();
    }
  }
);

app.get('/resources/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
              c.name AS course_name,
              COALESCE(rr.review_count, 0)::int AS review_count,
              COALESCE(rr.avg_rating, 0)::numeric(3,2) AS avg_rating
       FROM resources r
       LEFT JOIN courses c ON c.code = r.course_code
       LEFT JOIN (
         SELECT resource_id,
                COUNT(*)::int AS review_count,
                AVG(rating)   AS avg_rating
         FROM resource_reviews
         GROUP BY resource_id
       ) rr ON rr.resource_id = r.id
       WHERE r.contributor_id = $1
       ORDER BY r.created_at DESC`,
      [req.auth.user.id]
    );
    return res.json({ resources: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/resources', requireAuth, async (req, res) => {
  const courseCode = req.query.courseCode || null;
  const resourceType = req.query.resourceType || null;
  const queryText = req.query.q ? String(req.query.q).trim() : null;

  try {
    const { rows } = await pool.query(
      `SELECT r.*,
              c.name AS course_name,
              u.full_name AS contributor_name
       FROM resources r
       LEFT JOIN courses c ON c.code = r.course_code
       JOIN users u ON u.id = r.contributor_id
       WHERE ($1::text IS NULL OR r.course_code = $1)
         AND (
           $2::text IS NULL OR
           CASE
             WHEN $2 = 'past-year' THEN
               LOWER(COALESCE(r.resource_type, '')) IN ('past-year', 'past year', 'past-paper', 'past paper', 'exam', 'exam paper')
               OR LOWER(COALESCE(r.title, '')) LIKE '%past year%'
               OR LOWER(COALESCE(r.title, '')) LIKE '%past paper%'
               OR LOWER(COALESCE(r.title, '')) LIKE '%exam%'
             WHEN $2 = 'lecture-note' THEN
               LOWER(COALESCE(r.resource_type, '')) IN ('lecture-note', 'lecture notes', 'lecture note', 'notes', 'slides', 'pdf')
               OR LOWER(COALESCE(r.title, '')) LIKE '%lecture%'
               OR LOWER(COALESCE(r.title, '')) LIKE '%note%'
               OR LOWER(COALESCE(r.title, '')) LIKE '%slide%'
             ELSE LOWER(COALESCE(r.resource_type, '')) = LOWER($2)
           END
         )
         AND (
           $3::text IS NULL OR
           LOWER(COALESCE(r.course_code, '')) LIKE '%' || LOWER($3) || '%'
           OR LOWER(COALESCE(r.title, '')) LIKE '%' || LOWER($3) || '%'
           OR LOWER(COALESCE(r.resource_type, '')) LIKE '%' || LOWER($3) || '%'
           OR LOWER(COALESCE(u.full_name, '')) LIKE '%' || LOWER($3) || '%'
           OR LOWER(COALESCE(c.name, '')) LIKE '%' || LOWER($3) || '%'
         )
       ORDER BY r.created_at DESC`,
      [courseCode, resourceType, queryText]
    );

    return res.json({ resources: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/resources/:id', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);
  if (!resourceId) {
    return res.status(400).json({ message: 'Invalid resource id.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT r.*, 
              c.name AS course_name,
              u.full_name AS contributor_name,
              u.profile_picture_url AS contributor_profile_picture,
              COALESCE(rc.review_count, 0) AS review_count
       FROM resources r
       LEFT JOIN courses c ON c.code = r.course_code
       JOIN users u ON u.id = r.contributor_id
       LEFT JOIN (
         SELECT resource_id, COUNT(*)::int AS review_count
         FROM resource_reviews
         GROUP BY resource_id
       ) rc ON rc.resource_id = r.id
       WHERE r.id = $1
       LIMIT 1`,
      [resourceId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    return res.json({ resource: rows[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/resources/:id/reviews', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);
  if (!resourceId) {
    return res.status(400).json({ message: 'Invalid resource id.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT rr.id,
              rr.rating,
              rr.comment,
              rr.created_at,
              u.id AS reviewer_id,
              u.full_name AS reviewer_name,
              u.profile_picture_url AS reviewer_profile_picture
       FROM resource_reviews rr
       JOIN users u ON u.id = rr.reviewer_id
       WHERE rr.resource_id = $1
       ORDER BY rr.created_at DESC`,
      [resourceId]
    );

    return res.json({ reviews: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/resources/:id/file', async (req, res) => {
  const resourceId = Number(req.params.id);
  if (!Number.isInteger(resourceId) || resourceId < 1) {
    return res.status(400).json({ message: 'Invalid resource id.' });
  }

  const forceDownload = ['1', 'true', 'yes'].includes(
    String(req.query.download || '').toLowerCase()
  );

  try {
    const { rows } = await pool.query(
      `SELECT id, title, file_url
       FROM resources
       WHERE id = $1
       LIMIT 1`,
      [resourceId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const resource = rows[0];
    const rawFileUrl = String(resource.file_url || '').trim();
    if (!rawFileUrl) {
      return res.status(404).json({ message: 'Resource file URL is missing.' });
    }

    if (/^https?:\/\//i.test(rawFileUrl)) {
      return res.redirect(rawFileUrl);
    }

    if (rawFileUrl.startsWith('/uploads/resources/')) {
      const fileName = path.basename(rawFileUrl);
      const absolutePath = findUploadedFilePath('resources', fileName);
      if (!absolutePath) {
        return res.status(404).json({
          message: 'Uploaded file is not available on server storage.'
        });
      }

      if (forceDownload) {
        const suggestedName = resource.title
          ? `${String(resource.title).trim() || 'resource'}${path.extname(fileName)}`
          : fileName;
        res.setHeader('Content-Disposition', `attachment; filename="${suggestedName.replace(/"/g, '')}"`);
      }

      return res.sendFile(absolutePath);
    }

    return res.status(400).json({ message: 'Unsupported resource URL format.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/resources/:id/download', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);

  if (!Number.isInteger(resourceId) || resourceId < 1) {
    return res.status(400).json({ message: 'Invalid resource id.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, title, file_url
       FROM resources
       WHERE id = $1`,
      [resourceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    return res.json({
      message: 'Use downloadUrl to access this resource.',
      resource: rows[0],
      downloadUrl: `/resources/${resourceId}/file?download=1`,
      openUrl: `/resources/${resourceId}/file`
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/resources/:id/reviews', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);
  const { rating, comment } = req.body;

  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ message: 'rating must be between 1 and 5.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO resource_reviews (resource_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (resource_id, reviewer_id)
       DO UPDATE SET rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment,
                     created_at = NOW()`,
      [resourceId, req.auth.user.id, rating, comment || null]
    );

    await recalculateResourceRating(client, resourceId);
    await awardPoints(client, req.auth.user.id, 6, 'Rated a resource');

    await client.query('COMMIT');
    return res.json({ message: 'Resource review submitted.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.put('/resources/:id', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);
  const { title, resourceType, courseCode, metadata } = req.body;

  try {
    const ownerCheck = await pool.query(
      `SELECT id, contributor_id
       FROM resources
       WHERE id = $1`,
      [resourceId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const resource = ownerCheck.rows[0];
    const canEdit =
      req.auth.user.role === 'admin' ||
      Number(resource.contributor_id) === Number(req.auth.user.id);

    if (!canEdit) {
      return res.status(403).json({ message: 'Only the contributor or admin can edit this resource.' });
    }

    const { rows } = await pool.query(
      `UPDATE resources
       SET title = COALESCE($2, title),
           resource_type = COALESCE($3, resource_type),
           course_code = COALESCE($4, course_code),
           metadata = COALESCE($5::jsonb, metadata)
       WHERE id = $1
       RETURNING *`,
      [resourceId, title || null, resourceType || null, courseCode || null, metadata ? JSON.stringify(metadata) : null]
    );

    if (req.auth.user.role === 'admin') {
      await logAdminAction(pool, req.auth.user.id, 'resource_updated', 'resource', resourceId, {
        title: rows[0]?.title || null,
        resourceType: rows[0]?.resource_type || null
      });
    }

    return res.json({ resource: rows[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.delete('/resources/:id', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lookup = await client.query(
      `SELECT id, contributor_id, file_url
       FROM resources
       WHERE id = $1`,
      [resourceId]
    );

    if (lookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const resource = lookup.rows[0];
    const canDelete =
      req.auth.user.role === 'admin' ||
      Number(resource.contributor_id) === Number(req.auth.user.id);

    if (!canDelete) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only the contributor or admin can delete this resource.' });
    }

    await client.query('DELETE FROM resources WHERE id = $1', [resourceId]);

    if (req.auth.user.role === 'admin') {
      await logAdminAction(client, req.auth.user.id, 'resource_deleted', 'resource', resourceId, {
        fileUrl: resource.file_url || null
      });
    }

    if (String(resource.file_url || '').startsWith('/uploads/resources/')) {
      const filename = path.basename(resource.file_url);
      const absolutePath = path.join(resourceUploadDir, filename);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    await client.query('COMMIT');
    return res.json({ message: 'Resource deleted.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.post(
  '/uploads/verification',
  uploadRateLimiter,
  requireAuth,
  requireRole('tutor'),
  (req, res, next) => {
    verificationUpload.single('document')(req, res, (error) => {
      if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Max size is 10MB.' });
        }
        return res.status(400).json({ message: error.message });
      }
      return next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'document file is required.' });
    }

    const relativePath = `/uploads/verifications/${req.file.filename}`;
    return res.status(201).json({
      fileUrl: relativePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  }
);

app.post('/tutor-verifications', requireAuth, requireRole('tutor'), async (req, res) => {
  const { courseCode, proofUrl } = req.body;
  const normalizedCourseCode = courseCode ? String(courseCode).trim().toUpperCase() : null;

  if (!proofUrl) {
    return res.status(400).json({ message: 'proofUrl is required.' });
  }

  const isLocalUpload =
    typeof proofUrl === 'string' && proofUrl.startsWith('/uploads/verifications/');
  const uploadedFileName = isLocalUpload ? path.basename(proofUrl) : null;
  const uploadedFilePath = uploadedFileName
    ? findUploadedFilePath('verifications', uploadedFileName)
    : null;

  if (isLocalUpload && !uploadedFilePath) {
    return res.status(400).json({
      message:
        'Uploaded verification file was not found on server. Please upload the document again before submitting.'
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tutor_verifications (tutor_id, course_code, proof_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.auth.user.id, normalizedCourseCode, proofUrl]
    );

    return res.status(201).json({ application: rows[0] });
  } catch (error) {
    if (uploadedFilePath) {
      try {
        await fs.promises.unlink(uploadedFilePath);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          console.error('Verification upload cleanup failed:', cleanupError.message);
        }
      }
    }

    return res.status(500).json({ message: error.message });
  }
});

app.get('/tutor-verifications/me', requireAuth, requireRole('tutor'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT tv.*, reviewer.full_name AS reviewed_by_name
       FROM tutor_verifications tv
       LEFT JOIN users reviewer ON reviewer.id = tv.reviewed_by
       WHERE tv.tutor_id = $1
       ORDER BY tv.created_at DESC`,
      [req.auth.user.id]
    );

    return res.json({ applications: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get(
  '/admin/tutor-verifications',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT tv.*, u.full_name AS tutor_name, u.email AS tutor_email
         FROM tutor_verifications tv
         JOIN users u ON u.id = tv.tutor_id
         ORDER BY tv.created_at DESC`
      );

      const applications = rows.map((application) => {
        const proofUrl = String(application.proof_url || '');
        const isLocalVerificationProof = proofUrl.startsWith('/uploads/verifications/');
        const proofFileName = isLocalVerificationProof ? path.basename(proofUrl) : null;
        const hasProofFile = isLocalVerificationProof
          ? Boolean(proofFileName && findUploadedFilePath('verifications', proofFileName))
          : true;

        return {
          ...application,
          has_proof_file: hasProofFile
        };
      });

      return res.json({ applications });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

app.get('/users/:id/public/reviews', requireAuth, async (req, res) => {
  const rawId = String(req.params.id || '').trim();
  if (!rawId) {
    return res.status(400).json({ message: 'User id is required.' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, role
       FROM users
       WHERE id::text = $1
       LIMIT 1`,
      [rawId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (String(userResult.rows[0].role) !== 'tutor') {
      return res.json({ reviews: [] });
    }

    const { rows } = await pool.query(
      `SELECT br.id,
              br.rating,
              br.comment,
              br.created_at,
              reviewer.full_name AS reviewer_name,
              reviewer.role AS reviewer_role
       FROM booking_reviews br
       JOIN bookings b ON b.id = br.booking_id
       JOIN users reviewer ON reviewer.id = br.reviewer_id
       WHERE b.tutor_id = $1
         AND reviewer.role = 'tutee'
       ORDER BY br.created_at DESC`,
      [userResult.rows[0].id]
    );

    return res.json({ reviews: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post(
  '/admin/tutor-verifications/:id/request-reupload',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const applicationId = Number(req.params.id);
    const requestNote = String(req.body?.note || '').trim();

    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({ message: 'Invalid application id.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lookup = await client.query(
        `SELECT tv.id, tv.tutor_id, tv.status, tv.proof_url, u.full_name AS tutor_name
         FROM tutor_verifications tv
         JOIN users u ON u.id = tv.tutor_id
         WHERE tv.id = $1`,
        [applicationId]
      );

      if (lookup.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Application not found.' });
      }

      const application = lookup.rows[0];
      const messageBase =
        'Your tutor verification proof is unavailable or unclear. Please re-upload your verification document.';
      const message = requestNote ? `${messageBase} Note: ${requestNote}` : messageBase;

      await client.query(
        `UPDATE tutor_verifications
         SET status = 'reupload_requested',
             review_notes = COALESCE(NULLIF($1, ''), review_notes),
             reviewed_by = $2,
             reviewed_at = NOW()
         WHERE id = $3`,
        [requestNote || null, req.auth.user.id, application.id]
      );
      await createNotification(client, application.tutor_id, message);

      await logAdminAction(
        client,
        req.auth.user.id,
        'verification_reupload_requested',
        'tutor_verification',
        application.id,
        {
          tutorId: application.tutor_id,
          status: application.status,
          proofUrl: application.proof_url,
          note: requestNote || null
        }
      );

      await client.query('COMMIT');
      return res.json({
        message: `Re-upload request sent to ${application.tutor_name}.`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: error.message });
    } finally {
      client.release();
    }
  }
);

app.post(
  '/admin/tutor-verifications/:id/decision',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const applicationId = Number(req.params.id);
    const { decision, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        message: 'decision must be approved or rejected.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `UPDATE tutor_verifications
         SET status = $1,
             reviewed_by = $2,
             review_notes = $3,
             reviewed_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [decision, req.auth.user.id, reviewNotes || null, applicationId]
      );

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Application not found.' });
      }

      const application = updateResult.rows[0];

      if (decision === 'approved') {
        await client.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [
          application.tutor_id
        ]);
        await awardPoints(client, application.tutor_id, 20, 'Tutor verification approved');
      }

      await createNotification(
        client,
        application.tutor_id,
        `Verification update: application #${application.id} was ${decision}.`
      );

      await logAdminAction(
        client,
        req.auth.user.id,
        'verification_decision',
        'tutor_verification',
        application.id,
        {
          decision,
          tutorId: application.tutor_id,
          reviewNotes: reviewNotes || null
        }
      );

      await client.query('COMMIT');
      return res.json({ application });
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: error.message });
    } finally {
      client.release();
    }
  }
);

app.get('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,
              student_id,
              full_name,
              email,
              role,
              major,
              year_of_study,
              is_verified,
              rating,
              total_points,
              created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json({ users: rows.map((row) => sanitizeUser(row)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.patch('/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const userId = Number(req.params.id);
  const { isVerified, role } = req.body;

  if (role && !['tutor', 'tutee', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'role must be tutor, tutee, or admin.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET is_verified = COALESCE($2, is_verified),
           role = COALESCE($3, role)
       WHERE id = $1
       RETURNING *`,
      [userId, typeof isVerified === 'boolean' ? isVerified : null, role || null]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await logAdminAction(pool, req.auth.user.id, 'user_updated', 'user', userId, {
      role: rows[0].role,
      isVerified: rows[0].is_verified
    });

    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/admin/activity-logs', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await pool.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_name = 'admin_activity_logs'`
    );
    
    if (tableCheck.rows.length === 0) {
      return res.json({ logs: [] });
    }

    const { rows } = await pool.query(
      `SELECT l.id,
              l.action,
              l.target_type,
              l.target_id,
              l.details,
              l.created_at,
              u.full_name AS admin_name,
              u.email AS admin_email
       FROM admin_activity_logs l
       JOIN users u ON u.id = l.admin_id
       ORDER BY l.created_at DESC
       LIMIT 200`
    );

    return res.json({ logs: rows });
  } catch (error) {
    console.error('Error loading admin activity logs:', error.message);
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

app.get('/admin/error-logs', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await pool.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_name = 'server_error_logs'`
    );
    
    if (tableCheck.rows.length === 0) {
      return res.json({ logs: [] });
    }

    const { rows } = await pool.query(
      `SELECT l.id,
              l.path,
              l.method,
              l.status_code,
              l.message,
              l.stack,
              l.created_at,
              u.full_name AS user_name,
              u.email AS user_email
       FROM server_error_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT 300`
    );

    return res.json({ logs: rows.map((row) => sanitizeErrorLog(row)) });
  } catch (error) {
    console.error('Error loading server error logs:', error.message);
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

app.get('/admin/resources', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id,
              r.title,
              r.course_code,
              r.resource_type,
              r.created_at,
              r.file_url,
              CASE
                WHEN COALESCE(r.metadata->>'uploadKind', '') = 'link' THEN r.file_url
                WHEN r.file_url ~* '^https?://' THEN r.file_url
                ELSE NULL
              END AS link_url,
              u.id AS uploader_id,
              u.full_name AS uploader_name,
              u.email AS uploader_email
       FROM resources r
       JOIN users u ON u.id = r.contributor_id
       ORDER BY r.created_at DESC`
    );

    return res.json({ resources: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/admin/analytics', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Get total users
    const { rows: totalUsersResult } = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get verified tutors
    const { rows: verifiedTutorsResult } = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'tutor' AND is_verified = true`
    );
    const verifiedTutors = verifiedTutorsResult[0]?.count || 0;

    // Get active bookings (pending or accepted)
    const { rows: activeBookingsResult } = await pool.query(
      `SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending', 'accepted')`
    );
    const activeBookings = activeBookingsResult[0]?.count || 0;

    // Get total resources
    const { rows: totalResourcesResult } = await pool.query('SELECT COUNT(*) as count FROM resources');
    const totalResources = totalResourcesResult[0]?.count || 0;

    // Get total points distributed
    const { rows: totalPointsResult } = await pool.query('SELECT COALESCE(SUM(total_points), 0) as total FROM users');
    const totalPoints = totalPointsResult[0]?.total || 0;

    // Get total badges unlocked
    const { rows: totalBadgesResult } = await pool.query(
      `SELECT COUNT(*)::int as count FROM user_achievements`
    );
    const totalBadges = totalBadgesResult[0]?.count || 0;

    // Get top contributors (users with most resources)
    const { rows: topContributors } = await pool.query(
      `SELECT u.full_name as name,
              u.email,
              COUNT(r.id) as resourceCount
       FROM users u
       LEFT JOIN resources r ON r.contributor_id = u.id
       GROUP BY u.id, u.full_name, u.email
       HAVING COUNT(r.id) > 0
       ORDER BY resourceCount DESC
       LIMIT 5`
    );

    // Get points distribution by source
    const { rows: pointsData } = await pool.query(
      `SELECT 
        SUM(CASE WHEN reason = 'resource_upload' THEN points ELSE 0 END) as resource_upload,
        SUM(CASE WHEN reason = 'tutor_verification' THEN points ELSE 0 END) as tutor_verification,
        SUM(CASE WHEN reason = 'resource_review' THEN points ELSE 0 END) as resource_review,
        SUM(CASE WHEN reason = 'leaderboard_rank' THEN points ELSE 0 END) as leaderboard_rank
       FROM user_points_log`
    );

    const pointsDistribution = {
      resource_upload: pointsData[0]?.resource_upload || 0,
      tutor_verification: pointsData[0]?.tutor_verification || 0,
      resource_review: pointsData[0]?.resource_review || 0,
      leaderboard_rank: pointsData[0]?.leaderboard_rank || 0
    };

    const [trendRows, resourceTrendRows, userTrendRows, reviewTrendRows] = await Promise.all([
      pool.query(
        `SELECT
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS last_7,
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 day' AND created_at < NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS prev_7
         FROM bookings`
      ),
      pool.query(
        `SELECT
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS last_7,
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 day' AND created_at < NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS prev_7
         FROM resources`
      ),
      pool.query(
        `SELECT
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS last_7,
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 day' AND created_at < NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS prev_7
         FROM users`
      ),
      pool.query(
        `SELECT
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS last_7,
           SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 day' AND created_at < NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS prev_7
         FROM resource_reviews`
      ),
    ]);

    const trends = [
      { id: 'bookings',  label: 'New Bookings',        current: Number(trendRows.rows[0]?.last_7 || 0),        previous: Number(trendRows.rows[0]?.prev_7 || 0) },
      { id: 'resources', label: 'Resources Uploaded',   current: Number(resourceTrendRows.rows[0]?.last_7 || 0), previous: Number(resourceTrendRows.rows[0]?.prev_7 || 0) },
      { id: 'signups',   label: 'New User Sign-ups',    current: Number(userTrendRows.rows[0]?.last_7 || 0),     previous: Number(userTrendRows.rows[0]?.prev_7 || 0) },
      { id: 'reviews',   label: 'Resource Reviews',     current: Number(reviewTrendRows.rows[0]?.last_7 || 0),   previous: Number(reviewTrendRows.rows[0]?.prev_7 || 0) },
    ];

    return res.json({
      stats: {
        totalUsers: Number(totalUsers),
        verifiedTutors: Number(verifiedTutors),
        activeBookings: Number(activeBookings),
        totalResources: Number(totalResources),
        totalPoints: Number(totalPoints),
        totalBadges: Number(totalBadges),
      },
      trends,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/admin/reward-rules', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [rewardsResult, rewardRuleMap] = await Promise.all([
      pool.query(
        `SELECT id, code, name, description, points_cost, icon, is_active
         FROM point_rewards
         ORDER BY points_cost ASC, id ASC`
      ),
      getRewardRuleMap(pool)
    ]);

    const rules = rewardsResult.rows.map((reward) => {
      const rule = getRewardRule(reward.code, rewardRuleMap);
      const normalizedCode = String(reward.code || '').toUpperCase();
      const defaultRule = getRewardRule(reward.code, null);

      return {
        code: reward.code,
        name: reward.name,
        description: reward.description,
        pointsCost: Number(reward.points_cost || 0),
        isActive: Boolean(reward.is_active),
        cooldownDays: rule.cooldownDays,
        maxPer30Days: rule.maxPer30Days,
        maxPerDay: rule.maxPerDay,
        defaultCooldownDays: defaultRule.cooldownDays,
        defaultMaxPer30Days: defaultRule.maxPer30Days,
        defaultMaxPerDay: defaultRule.maxPerDay,
        isCustom: Boolean(rewardRuleMap[normalizedCode])
      };
    });

    return res.json({ rules });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.patch('/admin/reward-rules/:code', requireAuth, requireRole('admin'), async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const cooldownDays = Number(req.body?.cooldownDays);
  const maxPer30Days = Number(req.body?.maxPer30Days);
  const maxPerDay = Number(req.body?.maxPerDay);

  if (!code) {
    return res.status(400).json({ message: 'Reward code is required.' });
  }

  if (!Number.isInteger(cooldownDays) || cooldownDays < 0) {
    return res.status(400).json({ message: 'cooldownDays must be an integer >= 0.' });
  }

  if (!Number.isInteger(maxPer30Days) || maxPer30Days <= 0) {
    return res.status(400).json({ message: 'maxPer30Days must be an integer > 0.' });
  }

  if (!Number.isInteger(maxPerDay) || maxPerDay <= 0) {
    return res.status(400).json({ message: 'maxPerDay must be an integer > 0.' });
  }

  try {
    const rewardCheck = await pool.query(
      `SELECT code, name FROM point_rewards WHERE code = $1`,
      [code]
    );

    if (!rewardCheck.rows.length) {
      return res.status(404).json({ message: 'Reward not found.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO point_reward_rules (reward_code, cooldown_days, max_per_30_days, max_per_day, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (reward_code)
       DO UPDATE
       SET cooldown_days = EXCLUDED.cooldown_days,
           max_per_30_days = EXCLUDED.max_per_30_days,
           max_per_day = EXCLUDED.max_per_day,
           updated_at = NOW()
       RETURNING reward_code, cooldown_days, max_per_30_days, max_per_day, updated_at`,
      [code, cooldownDays, maxPer30Days, maxPerDay]
    );

    await logAdminAction(pool, req.auth.user.id, 'reward_rule_updated', 'point_reward_rules', null, {
      rewardCode: code,
      cooldownDays,
      maxPer30Days,
      maxPerDay
    });

    const row = rows[0] || {};
    return res.json({
      rule: {
        code: row.reward_code,
        cooldownDays: Number(row.cooldown_days || 0),
        maxPer30Days: Number(row.max_per_30_days || 0),
        maxPerDay: Number(row.max_per_day || 0),
        updatedAt: row.updated_at || null
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.delete('/admin/reward-rules/:code', requireAuth, requireRole('admin'), async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ message: 'Reward code is required.' });
  }

  try {
    const rewardCheck = await pool.query(
      `SELECT code, name FROM point_rewards WHERE code = $1`,
      [code]
    );

    if (!rewardCheck.rows.length) {
      return res.status(404).json({ message: 'Reward not found.' });
    }

    await pool.query(
      `DELETE FROM point_reward_rules
       WHERE reward_code = $1`,
      [code]
    );

    const fallbackRule = getRewardRule(code, null);

    await logAdminAction(pool, req.auth.user.id, 'reward_rule_reset', 'point_reward_rules', null, {
      rewardCode: code,
      cooldownDays: fallbackRule.cooldownDays,
      maxPer30Days: fallbackRule.maxPer30Days,
      maxPerDay: fallbackRule.maxPerDay
    });

    return res.json({
      message: `Reward rule reset for ${code}.`,
      rule: {
        code,
        cooldownDays: fallbackRule.cooldownDays,
        maxPer30Days: fallbackRule.maxPer30Days,
        maxPerDay: fallbackRule.maxPerDay,
        isCustom: false
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/notifications', requireAuth, async (req, res) => {
  const filter = String(req.query.filter || '').toLowerCase();
  const unreadOnly = filter === 'unread';

  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM notifications
       WHERE recipient_id = $1
         AND ($2::boolean = FALSE OR is_read = FALSE)
       ORDER BY created_at DESC`,
      [req.auth.user.id, unreadOnly]
    );

    return res.json({ notifications: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// NEW ENDPOINT: Mark all as read
app.patch('/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE recipient_id = $1`,
      [req.auth.user.id]
    );
    return res.json({ message: 'All notifications marked as read successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/notifications/:id/read', requireAuth, async (req, res) => {
  const notificationId = Number(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
         AND recipient_id = $2
       RETURNING *`,
      [notificationId, req.auth.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.json({ notification: rows[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/achievements/me', requireAuth, async (req, res) => {
  try {
    const pointStats = await getUserPointStats(pool, req.auth.user.id);

    const { rows } = await pool.query(
      `SELECT a.code,
              a.name,
              a.description,
              a.points_required,
              a.icon_url,
              (
                $2 = 'admin'
                OR ua.user_id IS NOT NULL
                OR $3 >= a.points_required
              ) AS is_unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua
         ON ua.achievement_id = a.id
        AND ua.user_id = $1
       ORDER BY a.points_required ASC`,
      [req.auth.user.id, req.auth.user.role, pointStats.lifetimePoints]
    );

    const { rows: reasonRows } = await pool.query(
      `SELECT reason,
              COALESCE(SUM(points), 0)::int AS points
       FROM user_points_log
       WHERE user_id = $1
         AND points > 0
       GROUP BY reason`,
      [req.auth.user.id]
    );

    return res.json({
      achievements: rows,
      totalPoints: pointStats.availablePoints,
      availablePoints: pointStats.availablePoints,
      lifetimePoints: pointStats.lifetimePoints,
      spentPoints: pointStats.spentPoints,
      pointsByReason: reasonRows
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET /redeem/rewards — list all active rewards with user's current balance
app.get('/redeem/rewards', requireAuth, async (req, res) => {
  try {
    const [rewardsResult, pointStats, rewardRuleMap] = await Promise.all([
      pool.query(`SELECT id, code, name, description, points_cost, icon FROM point_rewards WHERE is_active = TRUE ORDER BY points_cost ASC`),
      getUserPointStats(pool, req.auth.user.id),
      getRewardRuleMap(pool)
    ]);

    const { rows: rewardStatsRows } = await pool.query(
      `SELECT reward_id,
              MAX(redeemed_at) AS last_redeemed_at,
              COUNT(*) FILTER (WHERE redeemed_at >= NOW() - INTERVAL '30 days')::int AS redeemed_last_30_days
       FROM redemptions
       WHERE user_id = $1
       GROUP BY reward_id`,
      [req.auth.user.id]
    );

    const { rows: todayRows } = await pool.query(
      `SELECT COUNT(*)::int AS redeemed_today
       FROM redemptions
       WHERE user_id = $1
         AND redeemed_at >= date_trunc('day', NOW())`,
      [req.auth.user.id]
    );

    const redeemedToday = Number(todayRows[0]?.redeemed_today || 0);
    const rewardStatsMap = new Map(
      rewardStatsRows.map((row) => [
        Number(row.reward_id),
        {
          lastRedeemedAt: row.last_redeemed_at ? new Date(row.last_redeemed_at) : null,
          redeemedLast30Days: Number(row.redeemed_last_30_days || 0),
          redeemedToday
        }
      ])
    );

    const rewards = rewardsResult.rows.map((reward) => {
      const snapshot = rewardStatsMap.get(Number(reward.id)) || {
        lastRedeemedAt: null,
        redeemedLast30Days: 0,
        redeemedToday
      };

      const eligibility = evaluateRewardEligibility({
        reward,
        availablePoints: pointStats.availablePoints,
        snapshot,
        ruleMap: rewardRuleMap
      });

      return {
        ...reward,
        ...eligibility,
        lastRedeemedAt: snapshot.lastRedeemedAt,
        ruleSummary: {
          cooldownDays: eligibility.cooldownDays,
          maxPer30Days: eligibility.maxPer30Days,
          maxPerDay: eligibility.maxPerDay
        }
      };
    });

    return res.json({
      rewards,
      totalPoints: pointStats.availablePoints,
      availablePoints: pointStats.availablePoints,
      redeemedToday,
      maxPerDay: REWARD_RULES_DEFAULT.maxPerDay
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET /redeem/history — user's redemption history
app.get('/redeem/history', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.points_spent, r.redeemed_at, pr.name, pr.icon, pr.description
       FROM redemptions r
       JOIN point_rewards pr ON pr.id = r.reward_id
       WHERE r.user_id = $1
       ORDER BY r.redeemed_at DESC`,
      [req.auth.user.id]
    );
    return res.json({ history: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /redeem/:rewardId — redeem a reward, deducting points
app.post('/redeem/:rewardId', requireAuth, async (req, res) => {
  const rewardId = parseInt(req.params.rewardId, 10);
  if (!rewardId) return res.status(400).json({ message: 'Invalid reward ID.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rewardResult = await client.query(
      `SELECT id, code, name, points_cost FROM point_rewards WHERE id = $1 AND is_active = TRUE`,
      [rewardId]
    );
    if (!rewardResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reward not found.' });
    }
    const reward = rewardResult.rows[0];

    const rewardRuleMap = await getRewardRuleMap(client);

    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [req.auth.user.id]);

    const pointStats = await getUserPointStats(client, req.auth.user.id);
    const currentPoints = pointStats.availablePoints;

    if (currentPoints < reward.points_cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Not enough points. You need ${reward.points_cost} pts but have ${currentPoints} pts.` });
    }

    const snapshot = await getUserRedemptionSnapshot(client, req.auth.user.id, reward.id);
    const eligibility = evaluateRewardEligibility({
      reward,
      availablePoints: currentPoints,
      snapshot,
      ruleMap: rewardRuleMap
    });

    if (!eligibility.isEligible) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: eligibility.ineligibilityReason || 'This reward is currently not redeemable.' });
    }

    await client.query(
      `UPDATE users SET total_points = total_points - $1 WHERE id = $2`,
      [reward.points_cost, req.auth.user.id]
    );

    await client.query(
      `INSERT INTO redemptions (user_id, reward_id, points_spent) VALUES ($1, $2, $3)`,
      [req.auth.user.id, rewardId, reward.points_cost]
    );

    await client.query(
      `INSERT INTO user_points_log (user_id, points, reason) VALUES ($1, $2, $3)`,
      [req.auth.user.id, -reward.points_cost, 'redemption']
    );

    await createNotification(client, req.auth.user.id, `You redeemed "${reward.name}" for ${reward.points_cost} points.`);

    await client.query('COMMIT');
    return res.json({
      message: `Successfully redeemed "${reward.name}"!`,
      pointsSpent: reward.points_cost,
      balanceAfter: currentPoints - reward.points_cost
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

// ─── CHAT / MESSAGING ────────────────────────────────────────────────────────
// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────

// GET /push/vapid-public-key — return public VAPID key to client
app.get('/push/vapid-public-key', requireAuth, (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST /push/subscribe — save or refresh a push subscription
app.post('/push/subscribe', requireAuth, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'Invalid subscription object.' });
  }
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [req.auth.user.id, endpoint, keys.p256dh, keys.auth]
    );
    return res.json({ message: 'Subscribed.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE /push/unsubscribe — remove a push subscription
app.delete('/push/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body || {};
  try {
    if (endpoint) {
      await pool.query(
        `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
        [req.auth.user.id, endpoint]
      );
    } else {
      await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [req.auth.user.id]);
    }
    return res.json({ message: 'Unsubscribed.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// ─── CHAT / MESSAGING ────────────────────────────────────────────────────────

const attachAdminsToSupportConversations = async (dbClient, conversationId = null) => {
  const params = conversationId ? [conversationId] : []
  const conversationFilter = conversationId ? 'AND c.id = $1' : ''

  await dbClient.query(
    `INSERT INTO conversation_participants (conversation_id, user_id)
     SELECT c.id, u.id
     FROM conversations c
     JOIN users u ON u.role = 'admin'
     WHERE c.is_support = TRUE ${conversationFilter}
     ON CONFLICT DO NOTHING`,
    params
  )
}

// GET /conversations — list all conversations for the current user
app.get('/conversations', requireAuth, async (req, res) => {
  try {
    if (req.auth.user.role === 'admin') {
      await attachAdminsToSupportConversations(pool)
    }

    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.is_support,
         c.updated_at,
         (
           SELECT json_build_object('id', u.id, 'fullName', u.full_name, 'role', u.role, 'profilePicture', u.profile_picture_url)
           FROM conversation_participants cp2
           JOIN users u ON u.id = cp2.user_id
           WHERE cp2.conversation_id = c.id AND cp2.user_id <> $1
           LIMIT 1
         ) AS other_user,
         (
           SELECT m.content FROM chat_messages m
           WHERE m.conversation_id = c.id
           ORDER BY m.created_at DESC LIMIT 1
         ) AS last_message,
         (
           SELECT COUNT(*) FROM chat_messages m
           WHERE m.conversation_id = c.id
             AND m.sender_id <> $1
             AND m.created_at > COALESCE(
               (SELECT cp3.last_read_at FROM conversation_participants cp3
                WHERE cp3.conversation_id = c.id AND cp3.user_id = $1), '1970-01-01'
             )
         ) AS unread_count
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
       ORDER BY c.updated_at DESC`,
      [req.auth.user.id]
    );
    return res.json({ conversations: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /conversations — start a new direct conversation with another user
app.post('/conversations', requireAuth, async (req, res) => {
  const { userId } = req.body;
  const myId = req.auth.user.id;
  if (!userId || userId === myId) return res.status(400).json({ message: 'Invalid user.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check if conversation already exists between these two users
    const existing = await client.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       WHERE c.is_support = FALSE
       LIMIT 1`,
      [myId, userId]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.json({ conversationId: existing.rows[0].id, existed: true });
    }
    const conv = await client.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING id`
    );
    const convId = conv.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [convId, myId, userId]
    );
    await client.query('COMMIT');
    return res.json({ conversationId: convId, existed: false });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

// POST /conversations/support — open (or reuse) a support conversation with admin
app.post('/conversations/support', requireAuth, async (req, res) => {
  const myId = req.auth.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Reuse existing support conversation if any
    const existing = await client.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
       WHERE c.is_support = TRUE LIMIT 1`,
      [myId]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.json({ conversationId: existing.rows[0].id });
    }
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (!adminResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No admin user found.' });
    }

    const conv = await client.query(
      `INSERT INTO conversations (is_support) VALUES (TRUE) RETURNING id`
    );
    const convId = conv.rows[0].id;

    await attachAdminsToSupportConversations(client, convId)
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
      [convId, myId]
    )
    await client.query('COMMIT');
    return res.json({ conversationId: convId });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

// GET /conversations/:id/messages — fetch messages in a conversation
app.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const convId = parseInt(req.params.id, 10);
  try {
    // Verify user is a participant
    const check = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [convId, req.auth.user.id]
    );
    if (!check.rows.length) return res.status(403).json({ message: 'Access denied.' });

    const { rows } = await pool.query(
      `SELECT m.id, m.content, m.created_at,
              json_build_object('id', u.id, 'fullName', u.full_name, 'profilePicture', u.profile_picture_url) AS sender
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [convId]
    );

    // Mark as read
    await pool.query(
      `UPDATE conversation_participants SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [convId, req.auth.user.id]
    );

    return res.json({ messages: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /conversations/:id/messages — send a message
app.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const convId = parseInt(req.params.id, 10);
  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({ message: 'Message cannot be empty.' });
  if (content.length > 2000) return res.status(400).json({ message: 'Message too long.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [convId, req.auth.user.id]
    );
    if (!check.rows.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied.' });
    }

    const msgResult = await client.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, created_at`,
      [convId, req.auth.user.id, content]
    );

    await client.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [convId]
    );

    // Notify the other participant(s)
    const others = await client.query(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2`,
      [convId, req.auth.user.id]
    );
    for (const row of others.rows) {
      await createNotification(client, row.user_id, `New message from ${req.auth.user.fullName}`);
    }

    await client.query('COMMIT');
    return res.json({ id: msgResult.rows[0].id, createdAt: msgResult.rows[0].created_at });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

// GET /users/search — search users to start a new conversation
app.get('/users/search', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ users: [] });
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, role, profile_picture_url
       FROM users
       WHERE id <> $1
         AND role <> 'admin'
         AND (full_name ILIKE $2 OR email ILIKE $2)
       ORDER BY full_name ASC
       LIMIT 10`,
      [req.auth.user.id, `%${q}%`]
    );
    return res.json({ users: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }
  logServerError(req, err);
  console.error('Unhandled API error:', err);
  return res.status(500).json({ message: err.message || 'Unexpected server error.' });
});

// SPA fallback: serve index.html for any GET request that accepts HTML
// This allows client-side routes to work when users navigate directly.
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  const accept = String(req.get('Accept') || '');
  if (accept.includes('text/html') || accept.includes('application/xhtml+xml')) {
    return sendClientApp(res);
  }
  return next();
});

if (skipDbInit) {
  startServer(defaultPort);
} else {
  initializeDatabase()
    .then(() => {
      startServer(defaultPort);
    })
    .catch((error) => {
      console.error('Failed to initialize StudyLink API:', error);
      process.exit(1);
    });
}

