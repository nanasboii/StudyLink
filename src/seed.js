const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'studylink',
    password: process.env.DB_PASSWORD || 'studylink',
    database: process.env.DB_NAME || 'studylink',
    ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true'
      ? {
          rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true'
        }
      : undefined
  };
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const iterations = 100000;
  const keyLength = 64;
  const digest = 'sha512';
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, keyLength, digest)
    .toString('hex');
  return `${iterations}:${salt}:${hash}`;
}

async function seedDatabase() {
  const pool = new Pool(getPoolConfig());

  try {
    console.log('🌱 Seeding test accounts...\n');

    // Test Tutee Account
    const tuteePassword = hashPassword('password123');
    await pool.query(
      `INSERT INTO users
       (student_id, full_name, email, phone_number, password_hash, role, major, year_of_study, target_subjects, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (email) DO NOTHING`,
      [
        '1234567',
        'Test Tutee',
        'tutee@example.com',
        '0165555555',
        tuteePassword,
        'tutee',
        'Computer Science',
        2,
        'Database, Algorithms, Web Development',
        'I am a student looking for tutoring help',
        true
      ]
    );
    console.log('✅ Test Tutee account created');
    console.log('   Email: tutee@example.com');
    console.log('   Password: password123\n');

    // Test Tutor Account
    const tutorPassword = hashPassword('password123');
    await pool.query(
      `INSERT INTO users
       (student_id, full_name, email, phone_number, password_hash, role, major, year_of_study, expertise, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (email) DO NOTHING`,
      [
        '7654321',
        'Test Tutor',
        'tutor@example.com',
        '0165555556',
        tutorPassword,
        'tutor',
        'Computer Science',
        3,
        ARRAY['Java', 'Python', 'SQL'],
        'I am an experienced tutor in programming and databases',
        true
      ]
    );
    console.log('✅ Test Tutor account created');
    console.log('   Email: tutor@example.com');
    console.log('   Password: password123\n');

    console.log('🎉 Seeding completed successfully!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
