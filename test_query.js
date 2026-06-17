require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT br.id, br.booking_id, br.rating, br.comment, br.created_at, b.session_time, u.full_name AS reviewed_user_name FROM booking_reviews br JOIN bookings b ON b.id = br.booking_id JOIN users u ON u.id = CASE WHEN $1 = 'tutor' THEN b.tutee_id ELSE b.tutor_id END WHERE br.reviewer_id = $2 ORDER BY br.created_at DESC LIMIT 5", ['tutor', 1])
  .then(res => console.log(res.rows))
  .catch(err => console.error(err))
  .finally(() => pool.end());