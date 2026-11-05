const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/db");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows[0]) return res.status(409).json({ error: "An account with this email already exists." });

  const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'student'");
  const passwordHash = await bcrypt.hash(password, 10);
  const settingsRes = await pool.query("SELECT max_books_default FROM settings WHERE id = 1");
  const maxBooks = settingsRes.rows[0]?.max_books_default ?? 3;

  const inserted = await pool.query(
    `INSERT INTO users (name, email, password_hash, role_id, status, max_books)
     VALUES ($1,$2,$3,$4,'active',$5)
     RETURNING id, name, email, status, max_books`,
    [name, email.toLowerCase(), passwordHash, roleRes.rows[0].id, maxBooks]
  );
  const user = { ...inserted.rows[0], role: "student" };
  res.status(201).json({ user, token: signToken(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  const result = await pool.query(
    `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Incorrect email or password." });
  if (user.status === "inactive") return res.status(403).json({ error: "This account has been deactivated. Contact the librarian." });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Incorrect email or password." });

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, maxBooks: user.max_books };
  res.json({ user: safeUser, token: signToken(safeUser) });
}

async function me(req, res) {
  res.json({ user: req.user });
}

// Demo-friendly password reset: generates a short-lived code stored on the user row.
// In production this code would be emailed, never returned in the API response.
async function forgotPassword(req, res) {
  const { email } = req.body;
  const result = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!result.rows[0]) return res.status(404).json({ error: "No account found with that email." });

  const code = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await pool.query("UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE id = $3", [code, expires, result.rows[0].id]);

  // NOTE: for a real deployment, send `code` via email/SMS instead of returning it here.
  res.json({ message: "Reset code generated.", devOnlyResetCode: code });
}

async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  const result = await pool.query("SELECT id, reset_code, reset_code_expires FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || user.reset_code !== code || new Date(user.reset_code_expires) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL WHERE id = $2", [passwordHash, user.id]);
  res.json({ message: "Password reset successfully." });
}

module.exports = { register, login, me, forgotPassword, resetPassword };
