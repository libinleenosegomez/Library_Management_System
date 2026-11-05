const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function createUser(req, res) {
    const { name, email, password, role = "student", admissionNo, department, accountNo, maxBooks } = req.body;
    const normalizedEmail = email.toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows[0]) return res.status(409).json({ error: "An account with this email already exists." });

    const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1", [role]);
    const settingsRes = role === "student" ? await pool.query("SELECT max_books_default FROM settings WHERE id = 1") : null;
    const passwordHash = await bcrypt.hash(password, 10);
    const defaultMaxBooks = settingsRes ? settingsRes.rows[0].max_books_default : 3;
    const inserted = await pool.query(
        `INSERT INTO users (name, email, password_hash, role_id, max_books, admission_no, department, account_no)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, name, email, status, max_books, admission_no, department, account_no`, [name, normalizedEmail, passwordHash, roleRes.rows[0].id, maxBooks || defaultMaxBooks, admissionNo || null, department || null, accountNo || null]
    );
    res.status(201).json({ user: {...inserted.rows[0], role } });
}

async function listUsers(req, res) {
    const { q, role } = req.query;
    let sql = `SELECT u.id, u.name, u.email, u.status, u.max_books, u.admission_no, u.department, u.account_no, u.created_at, r.name AS role
             FROM users u JOIN roles r ON r.id = u.role_id WHERE 1=1`;
    const params = [];
    if (q) {
        params.push(`%${q.toLowerCase()}%`);
        sql += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }
    if (role) {
        params.push(role);
        sql += ` AND r.name = $${params.length}`;
    }
    sql += " ORDER BY u.created_at DESC";
    const result = await pool.query(sql, params);
    res.json({ users: result.rows });
}

async function getUserProfile(req, res) {
    const { id } = req.params;
    const userRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.status, u.max_books, u.created_at, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`, [id]
    );
    if (!userRes.rows[0]) return res.status(404).json({ error: "User not found." });

    const borrowings = await pool.query(
        `SELECT bo.id, b.title, bo.borrow_date, bo.due_date, bo.return_date, bo.status
     FROM borrowings bo JOIN books b ON b.id = bo.book_id WHERE bo.user_id = $1 ORDER BY bo.borrow_date DESC`, [id]
    );
    const fines = await pool.query(`SELECT id, amount, status, reason, fine_date FROM fines WHERE user_id = $1 ORDER BY fine_date DESC`, [id]);

    res.json({ user: userRes.rows[0], borrowings: borrowings.rows, fines: fines.rows });
}

async function updateUser(req, res) {
    const { name, email, maxBooks, admissionNo, department, accountNo } = req.body;
    const result = await pool.query(
        `UPDATE users SET name = COALESCE($1,name), email = COALESCE($2,email), max_books = COALESCE($3,max_books),
         admission_no = COALESCE($4,admission_no), department = COALESCE($5,department), account_no = COALESCE($6,account_no)
     WHERE id = $7 RETURNING id, name, email, max_books, admission_no, department, account_no`, [name, email, maxBooks, admissionNo, department, accountNo, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found." });
    res.json({ user: result.rows[0] });
}

async function setStatus(req, res) {
    const { status } = req.body; // 'active' | 'inactive'
    const result = await pool.query("UPDATE users SET status = $1 WHERE id = $2 RETURNING id, status", [status, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found." });
    res.json({ user: result.rows[0] });
}

async function changeOwnPassword(req, res) {
    const bcrypt = require("bcryptjs");
    const { currentPassword, newPassword } = req.body;
    const userRes = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const ok = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Current password is incorrect." });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password changed." });
}

module.exports = { createUser, listUsers, getUserProfile, updateUser, setStatus, changeOwnPassword };