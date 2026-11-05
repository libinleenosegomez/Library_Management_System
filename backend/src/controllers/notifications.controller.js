const pool = require("../config/db");

async function listNotifications(req, res) {
  const result = await pool.query(
    "SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
    [req.user.id]
  );
  res.json({ notifications: result.rows });
}

async function markAllRead(req, res) {
  await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [req.user.id]);
  res.json({ message: "All notifications marked as read." });
}

module.exports = { listNotifications, markAllRead };
