const pool = require("../config/db");

async function listReservations(req, res) {
  let sql = `
    SELECT r.id, r.book_id, b.title, r.user_id, u.name AS user_name, r.reserve_date, r.status
    FROM reservations r JOIN books b ON b.id = r.book_id JOIN users u ON u.id = r.user_id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== "admin") { params.push(req.user.id); sql += ` AND r.user_id = $${params.length}`; }
  sql += " ORDER BY r.reserve_date DESC";
  const result = await pool.query(sql, params);
  res.json({ reservations: result.rows });
}

async function createReservation(req, res) {
  const { bookId } = req.body;
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const availRes = await client.query(
      "SELECT COUNT(*) FROM book_copies WHERE book_id = $1 AND status = 'available'",
      [bookId]
    );
    if (Number(availRes.rows[0].count) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Copies are available — borrow it directly instead of reserving." });
    }
    const dup = await client.query(
      "SELECT 1 FROM reservations WHERE book_id = $1 AND user_id = $2 AND status IN ('waiting','available')",
      [bookId, userId]
    );
    if (dup.rows[0]) { await client.query("ROLLBACK"); return res.status(400).json({ error: "You already have a reservation for this book." }); }

    const inserted = await client.query(
      "INSERT INTO reservations (book_id, user_id) VALUES ($1,$2) RETURNING id, reserve_date, status",
      [bookId, userId]
    );
    await client.query("COMMIT");
    res.status(201).json({ reservation: inserted.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function cancelReservation(req, res) {
  const { id } = req.params;
  const check = await pool.query("SELECT user_id FROM reservations WHERE id = $1", [id]);
  if (!check.rows[0]) return res.status(404).json({ error: "Reservation not found." });
  if (req.user.role !== "admin" && check.rows[0].user_id !== req.user.id) {
    return res.status(403).json({ error: "You can only cancel your own reservations." });
  }
  await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [id]);
  res.json({ message: "Reservation cancelled." });
}

module.exports = { listReservations, createReservation, cancelReservation };
