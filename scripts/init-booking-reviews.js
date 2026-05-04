#!/usr/bin/env node
// One-off script to create the booking_reviews table if missing.
// Usage: set env vars (DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) then run:
//   node scripts/init-booking-reviews.js

const { Pool } = require('pg');
require('dotenv').config();

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'studylink',
    password: process.env.DB_PASSWORD || 'studylink',
    database: process.env.DB_NAME || 'studylink'
  };
}

const sql = `
CREATE TABLE IF NOT EXISTS booking_reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, reviewer_id)
);
`;

(async () => {
  const pool = new Pool(getPoolConfig());
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database, running migration...');
    await client.query(sql);
    console.log('booking_reviews table ensured.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(2);
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
