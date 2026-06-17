const { Pool } = require('pg');
require('dotenv').config();

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'studylink'
  };
};

const pool = new Pool(getPoolConfig());

const migrateQuizzesTable = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Running quiz table migration...');

    await client.query('BEGIN');

    // Create quizzes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code VARCHAR(30),
        title VARCHAR(250) NOT NULL,
        description TEXT,
        cover_color VARCHAR(7) NOT NULL DEFAULT '#b11f4b',
        time_limit_seconds INTEGER NOT NULL DEFAULT 20,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        play_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create quiz_questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_order INTEGER NOT NULL DEFAULT 0,
        time_limit_seconds INTEGER,
        points INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create quiz_answers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        answer_text VARCHAR(500) NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        answer_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Create quiz_attempts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        correct_count INTEGER NOT NULL DEFAULT 0,
        total_questions INTEGER NOT NULL DEFAULT 0,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create quiz_attempt_answers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        selected_answer_id INTEGER REFERENCES quiz_answers(id) ON DELETE SET NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        points_earned INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Quiz tables migrated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

migrateQuizzesTable()
  .then(() => {
    console.log('✨ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
