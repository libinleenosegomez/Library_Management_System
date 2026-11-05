const pool = require("../config/db");

async function getSettings(req, res) {
  const result = await pool.query("SELECT loan_days, fine_per_day, max_books_default FROM settings WHERE id = 1");
  res.json({ settings: result.rows[0] });
}

async function updateSettings(req, res) {
  const { loanDays, finePerDay, maxBooksDefault } = req.body;
  const result = await pool.query(
    `UPDATE settings SET loan_days = COALESCE($1, loan_days), fine_per_day = COALESCE($2, fine_per_day),
     max_books_default = COALESCE($3, max_books_default) WHERE id = 1
     RETURNING loan_days, fine_per_day, max_books_default`,
    [loanDays, finePerDay, maxBooksDefault]
  );
  res.json({ settings: result.rows[0] });
}

module.exports = { getSettings, updateSettings };
