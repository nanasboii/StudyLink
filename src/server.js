const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const defaultPort = Number(process.env.PORT || 6767);
const sessionHours = Number(process.env.SESSION_DURATION_HOURS || 24);
const uploadBaseDir = path.join(__dirname, 'uploads');
const legacyUploadBaseDir = path.join(__dirname, '..', 'uploads');
const verificationUploadDir = path.join(uploadBaseDir, 'verifications');
const resourceUploadDir = path.join(uploadBaseDir, 'resources');
const profilePictureUploadDir = path.join(uploadBaseDir, 'profile-pictures');

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

async function removeProfilePictureFile(fileUrl) {
  const filePath = String(fileUrl || '');
  if (!filePath.startsWith('/uploads/profile-pictures/')) {
    return;
  }

  const fileName = path.basename(filePath);
  const absolutePath = findUploadedFilePath('profile-pictures', fileName);
  if (!absolutePath) {
    return;
  }

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Profile picture cleanup failed:', error.message);
    }
  }
}

function startServer(preferredPort, attemptsLeft = 20) {
  const server = app.listen(preferredPort, () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : preferredPort;
    console.log(`StudyLink API listening on port ${activePort}`);
    console.log(`API: http://localhost:${activePort}`);
    console.log(`API (127.0.0.1): http://127.0.0.1:${activePort}`);
    console.log(`UI: http://localhost:${activePort}/ui`);
    console.log(`UI (127.0.0.1): http://127.0.0.1:${activePort}/ui`);
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = preferredPort + 1;
      console.warn(`Port ${preferredPort} is in use. Retrying on ${nextPort}...`);
      startServer(nextPort, attemptsLeft - 1);
      return;
    }

    if (error && error.code === 'EADDRINUSE') {
      console.error(`Unable to bind a port starting from ${defaultPort}. Set PORT to a free port.`);
      process.exit(1);
    }

    console.error('Failed to start StudyLink API:', error);
    process.exit(1);
  });
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

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'studylink',
  password: process.env.DB_PASSWORD || 'studylink',
  database: process.env.DB_NAME || 'studylink'
});

app.use(express.json({ limit: '2mb' }));
app.use('/ui', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadBaseDir));
app.use('/uploads', express.static(legacyUploadBaseDir));

app.get('/ui/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, profilePictureUploadDir),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      cb(null, `profile-${req.auth.user.id}-${unique}${extension}`);
    }
  }),
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
    createdAt: row.created_at
  };
}

async function createNotification(client, recipientId, message) {
  await client.query(
    `INSERT INTO notifications (recipient_id, message)
     VALUES ($1, $2)`,
    [recipientId, message]
  );
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

async function grantBadges(client, userId) {
  await client.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT u.id, a.id
     FROM users u
     JOIN achievements a ON u.total_points >= a.points_required
     LEFT JOIN user_achievements ua
       ON ua.user_id = u.id
      AND ua.achievement_id = a.id
     WHERE u.id = $1
       AND ua.user_id IS NULL`,
    [userId]
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS target_subjects TEXT;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS expertise TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

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
        course_code VARCHAR(30) REFERENCES courses(code),
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
        course_code VARCHAR(30) REFERENCES courses(code),
        day_of_week VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tutee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code VARCHAR(30) REFERENCES courses(code),
        session_time TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

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
        course_code VARCHAR(30) REFERENCES courses(code),
        proof_url TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP
      );
    `);

    await client.query(
      `INSERT INTO achievements (code, name, description, points_required, icon_url)
       VALUES
         ('POINTS_25', 'Helping Hand', 'Reached 25 points by supporting classmates.', 25, '/ui/assets/badges/helping-hand.svg'),
         ('POINTS_50', 'Rising Contributor', 'Reached 50 points by helping peers.', 50, '/ui/assets/badges/rising-contributor.svg'),
         ('POINTS_100', 'Campus Mentor', 'Reached 100 points through tutoring and sharing.', 100, '/ui/assets/badges/campus-mentor.svg'),
         ('POINTS_250', 'StudyLink Champion', 'Reached 250 points as a top supporter.', 250, '/ui/assets/badges/studylink-champion.svg')
       ON CONFLICT (code)
       DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         points_required = EXCLUDED.points_required,
         icon_url = EXCLUDED.icon_url`
    );

    await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       SELECT u.id, a.id
       FROM users u
       JOIN achievements a ON u.total_points >= a.points_required
       LEFT JOIN user_achievements ua
         ON ua.user_id = u.id
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

app.get('/', (req, res) => {
  res.json({
    name: 'StudyLink API',
    status: 'running',
    modules: [
      'authentication',
      'profile',
      'resources',
      'bookings',
      'achievements',
      'notifications',
      'admin-verification'
    ]
  });
});

app.get('/health', async (req, res) => {
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

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase()
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, user.id, expiresAt]
    );

    return res.json({
      message: 'Login successful.',
      token,
      expiresAt,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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

app.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.auth.user });
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
    !nextProfilePictureUrl.startsWith('/uploads/profile-pictures/')
  ) {
    return res.status(400).json({ message: 'Invalid profile picture URL.' });
  }

  const normalizedExpertise =
    req.auth.user.role === 'tutor' && Array.isArray(expertise)
      ? expertise.filter((item) => String(item).trim()).map((item) => String(item).trim())
      : null;

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

    const previousProfilePictureUrl = req.auth.user.profile_picture_url;
    const currentProfilePictureUrl = rows[0].profile_picture_url;
    if (
      previousProfilePictureUrl &&
      previousProfilePictureUrl !== currentProfilePictureUrl
    ) {
      await removeProfilePictureFile(previousProfilePictureUrl);
    }

    await awardPoints(pool, req.auth.user.id, 5, 'Profile updated');

    return res.json({
      message: 'Profile updated.',
      user: sanitizeUser(rows[0])
    });
  } catch (error) {
    if (nextProfilePictureUrl) {
      await removeProfilePictureFile(nextProfilePictureUrl);
    }
    return res.status(500).json({ message: error.message });
  }
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

    const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;
    return res.status(201).json({ fileUrl });
  }
);

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
    const { rows } = await pool.query(
      `SELECT u.id,
              u.full_name,
              u.role,
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
       ORDER BY COALESCE(ua.total_achievements, 0) DESC,
                u.total_points DESC,
                COALESCE(rc.reviews_received, 0) DESC,
                u.full_name ASC
       LIMIT 20`
    );
    return res.json({ leaderboard: rows });
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
    return res.status(500).json({ message: error.message });
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
    return res.status(500).json({ message: error.message });
  }
});

app.get('/tutors', requireAuth, async (req, res) => {
  const courseCode = req.query.courseCode
    ? String(req.query.courseCode).trim().toUpperCase()
    : null;

  try {
    const { rows } = await pool.query(
      `SELECT u.id,
              u.student_id,
              u.full_name,
              u.major,
              u.year_of_study,
              u.expertise,
              u.bio,
              u.rating,
              u.total_points,
              u.is_verified,
              COALESCE(
                json_agg(
                  json_build_object(
                    'courseCode', ta.course_code,
                    'dayOfWeek', ta.day_of_week,
                    'startTime', to_char(ta.start_time, 'HH24:MI'),
                    'endTime', to_char(ta.end_time, 'HH24:MI')
                  )
                  ORDER BY ta.day_of_week, ta.start_time
                ) FILTER (WHERE ta.id IS NOT NULL),
                '[]'::json
              ) AS availability
       FROM users u
       LEFT JOIN tutor_availability ta
              ON ta.tutor_id = u.id
             AND ($1::text IS NULL OR ta.course_code = $1)
       WHERE u.role = 'tutor'
         AND ($1::text IS NULL OR ta.id IS NOT NULL)
       GROUP BY u.id, u.student_id, u.full_name, u.major, u.year_of_study, u.bio, u.rating, u.total_points, u.is_verified
       ORDER BY u.is_verified DESC, u.rating DESC, u.total_points DESC, u.full_name ASC`,
      [courseCode]
    );

    return res.json({ tutors: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/bookings', requireAuth, requireRole('tutee'), async (req, res) => {
  const { tutorId, courseCode, sessionTime, notes } = req.body;

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
      [tutor.id, req.auth.user.id, courseCode || null, sessionTime, notes || null]
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

      if (courseCode) {
        const courseCheck = await client.query('SELECT 1 FROM courses WHERE code = $1', [courseCode]);
        if (courseCheck.rows.length === 0) {
          if (req.file) {
            try {
              await fs.promises.unlink(req.file.path);
            } catch (cleanupError) {
              if (cleanupError.code !== 'ENOENT') {
                console.error('Resource upload cleanup failed:', cleanupError.message);
              }
            }
          }

          await client.query('ROLLBACK');
          return res.status(400).json({
            message:
              'Invalid course code. Use a course from /courses (for example: TMF3953, TMF3963, TMF3973), or leave it blank.'
          });
        }
      }

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

app.post('/resources/:id/download', requireAuth, async (req, res) => {
  const resourceId = Number(req.params.id);

  try {
    const { rows } = await pool.query(
      `SELECT id, title, file_url, metadata
       FROM resources
       WHERE id = $1`,
      [resourceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    return res.json({
      message: 'Use fileUrl to download the resource securely from storage.',
      resource: rows[0]
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

  if (normalizedCourseCode) {
    const courseCheck = await pool.query('SELECT 1 FROM courses WHERE code = $1', [
      normalizedCourseCode
    ]);

    if (courseCheck.rows.length === 0) {
      if (uploadedFilePath) {
        try {
          await fs.promises.unlink(uploadedFilePath);
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') {
            console.error('Verification upload cleanup failed:', cleanupError.message);
          }
        }
      }

      return res.status(400).json({
        message:
          'Invalid course code. Use a course from /courses (for example: TMF3953, TMF3963, TMF3973), or leave it blank.'
      });
    }
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

    return res.json({ logs: rows });
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
              r.link_url,
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
      `SELECT COUNT(DISTINCT user_id) as count FROM user_achievements WHERE unlocked_at IS NOT NULL`
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

    const { rows: trendRows } = await pool.query(
      `SELECT
         SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS bookings_last_7,
         SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 day' AND created_at < NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS bookings_prev_7
       FROM bookings`
    );

    const { rows: resourceTrendRows } = await pool.query(
      `SELECT
         SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS resources_last_7,
         SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 day' AND created_at < NOW() - INTERVAL '7 day' THEN 1 ELSE 0 END) AS resources_prev_7
       FROM resources`
    );

    const trends = {
      bookingsLast7Days: Number(trendRows[0]?.bookings_last_7 || 0),
      bookingsPrev7Days: Number(trendRows[0]?.bookings_prev_7 || 0),
      resourcesLast7Days: Number(resourceTrendRows[0]?.resources_last_7 || 0),
      resourcesPrev7Days: Number(resourceTrendRows[0]?.resources_prev_7 || 0)
    };

    return res.json({
      analytics: {
        totalUsers,
        verifiedTutors,
        activeBookings,
        totalResources,
        totalPoints,
        totalBadges,
        topContributors,
        pointsDistribution,
        trends
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC`,
      [req.auth.user.id]
    );

    return res.json({ notifications: rows });
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
      [req.auth.user.id, req.auth.user.role, Number(req.auth.user.totalPoints || 0)]
    );

    return res.json({ achievements: rows });
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

initializeDatabase()
  .then(() => {
    startServer(defaultPort);
  })
  .catch((error) => {
    console.error('Failed to initialize StudyLink API:', error);
    process.exit(1);
  });
