const pool = require("../config/db");

async function listFines(req, res) {
  const { status } = req.query;
  let sql = `
    SELECT f.id, f.amount, f.status, f.reason, f.fine_date, f.paid_date, f.user_id, u.name AS user_name,
           b.title AS book_title
    FROM fines f
    JOIN users u ON u.id = f.user_id
    JOIN borrowings bo ON bo.id = f.borrowing_id
    JOIN books b ON b.id = bo.book_id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== "admin") { params.push(req.user.id); sql += ` AND f.user_id = $${params.length}`; }
  if (status && status !== "all") { params.push(status); sql += ` AND f.status = $${params.length}`; }
  sql += " ORDER BY f.fine_date DESC";
  const result = await pool.query(sql, params);
  res.json({ fines: result.rows });
}

async function payFine(req, res) {
  const { id } = req.params;
  const fineRes = await pool.query("SELECT * FROM fines WHERE id = $1", [id]);
  if (!fineRes.rows[0]) return res.status(404).json({ error: "Fine not found." });
  if (fineRes.rows[0].status !== "unpaid") return res.status(400).json({ error: "This fine is not currently unpaid." });

  await pool.query("UPDATE fines SET status = 'paid', paid_date = CURRENT_DATE WHERE id = $1", [id]);
  await pool.query(
    "INSERT INTO payments (fine_id, amount, method, processed_by) VALUES ($1,$2,'cash',$3)",
    [id, fineRes.rows[0].amount, req.user.id]
  );
  res.json({ message: "Fine marked as paid." });
}

async function waiveFine(req, res) {
  const { id } = req.params;
  const result = await pool.query(
    "UPDATE fines SET status = 'waived', paid_date = CURRENT_DATE WHERE id = $1 AND status = 'unpaid' RETURNING id",
    [id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Fine not found or already resolved." });
  res.json({ message: "Fine waived." });
}

async function paymentHistory(req, res) {
  const result = await pool.query(`
    SELECT p.id, p.amount, p.method, p.paid_at, f.reason, u.name AS user_name
    FROM payments p JOIN fines f ON f.id = p.fine_id JOIN users u ON u.id = f.user_id
    ORDER BY p.paid_at DESC
  `);
  res.json({ payments: result.rows });
}

module.exports = { listFines, payFine, waiveFine, paymentHistory };
