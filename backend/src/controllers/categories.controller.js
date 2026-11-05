const pool = require("../config/db");

async function listCategories(req, res) {
  const result = await pool.query(`
    SELECT c.id, c.name, COUNT(b.id) FILTER (WHERE b.is_deleted = false)::int AS book_count
    FROM categories c
    LEFT JOIN books b ON b.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
  res.json({ categories: result.rows });
}

async function createCategory(req, res) {
  const { name } = req.body;
  const result = await pool.query("INSERT INTO categories (name) VALUES ($1) RETURNING id, name", [name]);
  res.status(201).json({ category: result.rows[0] });
}

async function updateCategory(req, res) {
  const { name } = req.body;
  const result = await pool.query("UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name", [name, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Category not found." });
  res.json({ category: result.rows[0] });
}

async function deleteCategory(req, res) {
  const inUse = await pool.query("SELECT 1 FROM books WHERE category_id = $1 AND is_deleted = false LIMIT 1", [req.params.id]);
  if (inUse.rows[0]) return res.status(409).json({ error: "Can't delete a category that still has books. Reassign those books first." });
  await pool.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
  res.json({ message: "Category deleted." });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
