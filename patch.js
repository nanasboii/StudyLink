const fs = require("fs");
let c = fs.readFileSync("src/server.js", "utf8");
const oldStr = "app.post('/bookings/:id/cancel', requireAuth, async (req, res) => {";
const newStr = `app.get('/users/me/submitted-reviews', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT br.id, br.booking_id, br.rating, br.comment, br.created_at, b.session_time, u.full_name AS reviewed_user_name FROM booking_reviews br JOIN bookings b ON b.id = br.booking_id JOIN users u ON u.id = CASE WHEN $1 = 'tutor' THEN b.tutee_id ELSE b.tutor_id END WHERE br.reviewer_id = $2 ORDER BY br.created_at DESC LIMIT 5",
      [req.auth.user.role, req.auth.user.id]
    );
    return res.json({ reviews: rows });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/bookings/:id/cancel', requireAuth, async (req, res) => {`;
c = c.replace(oldStr, newStr);
fs.writeFileSync("src/server.js", c);
console.log("Patched successfully!");
