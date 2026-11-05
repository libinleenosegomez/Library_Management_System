const pool = require("../config/db");

async function getOrCreateLookup(client, table, name) {
    const existing = await client.query(`SELECT id FROM ${table} WHERE name = $1`, [name]);
    if (existing.rows[0]) return existing.rows[0].id;
    const inserted = await client.query(`INSERT INTO ${table} (name) VALUES ($1) RETURNING id`, [name]);
    return inserted.rows[0].id;
}

const BOOK_SELECT = `
  SELECT b.id, b.isbn, b.title, a.name AS author, p.name AS publisher, c.id AS category_id,
         c.name AS category, b.publication_year, b.total_copies, b.cover_image_url, b.created_at,
         COUNT(bc.id) FILTER (WHERE bc.status = 'available')::int AS available_copies
  FROM books b
  JOIN authors a ON a.id = b.author_id
  JOIN publishers p ON p.id = b.publisher_id
  JOIN categories c ON c.id = b.category_id
  LEFT JOIN book_copies bc ON bc.book_id = b.id
  WHERE b.is_deleted = false
  GROUP BY b.id, a.name, p.name, c.id, c.name
`;

async function listBooks(req, res) {
    const { q, category, available, sort, year } = req.query;
    let sql = BOOK_SELECT;
    const params = [];
    const having = [];

    if (q) {
        params.push(`%${q.toLowerCase()}%`);
        sql = sql.replace(
            "WHERE b.is_deleted = false",
            `WHERE b.is_deleted = false AND (LOWER(b.title) LIKE $${params.length} OR LOWER(a.name) LIKE $${params.length} OR LOWER(b.isbn) LIKE $${params.length} OR LOWER(p.name) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length})`
        );
    }
    if (category) {
        params.push(category);
        sql = sql.replace("WHERE b.is_deleted = false", `WHERE b.is_deleted = false AND c.id = $${params.length}`);
    }
    if (year) {
        params.push(Number(year));
        sql = sql.replace("WHERE b.is_deleted = false", `WHERE b.is_deleted = false AND b.publication_year = $${params.length}`);
    }
    if (available === "true") having.push("COUNT(bc.id) FILTER (WHERE bc.status = 'available') > 0");
    if (available === "false") having.push("COUNT(bc.id) FILTER (WHERE bc.status = 'available') = 0");
    if (having.length) sql += ` HAVING ${having.join(" AND ")}`;

    const order = { title: "b.title ASC", year: "b.publication_year DESC", available: "available_copies DESC" }[sort] || "b.title ASC";
    sql += ` ORDER BY ${order}`;

    const result = await pool.query(sql, params);
    res.json({ books: result.rows });
}

async function getBook(req, res) {
    const result = await pool.query(BOOK_SELECT.replace("GROUP BY", "AND b.id = $1 GROUP BY"), [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Book not found." });
    const borrowerRes = await pool.query(
        `SELECT u.name AS user_name, bo.borrow_date, bo.due_date, bo.return_date, bo.status
     FROM borrowings bo JOIN users u ON u.id = bo.user_id
     WHERE bo.book_id = $1 ORDER BY bo.borrow_date DESC`, [req.params.id]
    );
    res.json({ book: result.rows[0], borrowers: borrowerRes.rows });
}

async function createBook(req, res) {
    const { isbn, title, author, publisher, categoryId, publicationYear, totalCopies } = req.body;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const dup = await client.query("SELECT id FROM books WHERE isbn = $1 AND is_deleted = false", [isbn]);
        if (dup.rows[0]) {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: "ISBN must be unique — this ISBN is already in use." });
        }
        const authorId = await getOrCreateLookup(client, "authors", author);
        const publisherId = await getOrCreateLookup(client, "publishers", publisher);
        const copies = Math.max(1, Number(totalCopies) || 1);
        const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const inserted = await client.query(
            `INSERT INTO books (isbn, title, author_id, publisher_id, category_id, publication_year, total_copies, cover_image_url, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [isbn, title, authorId, publisherId, categoryId, publicationYear, copies, coverImageUrl, req.user.id]
        );
        const bookId = inserted.rows[0].id;
        for (let i = 1; i <= copies; i++) {
            await client.query(`INSERT INTO book_copies (book_id, copy_number, status) VALUES ($1,$2,'available')`, [bookId, i]);
        }
        await client.query("COMMIT");
        res.status(201).json({ message: "Book added.", bookId });
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function updateBook(req, res) {
    const { id } = req.params;
    const { isbn, title, author, publisher, categoryId, publicationYear, totalCopies } = req.body;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT * FROM books WHERE id = $1 AND is_deleted = false", [id]);
        if (!existing.rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Book not found." }); }

        if (isbn) {
            const dup = await client.query("SELECT id FROM books WHERE isbn = $1 AND id != $2 AND is_deleted = false", [isbn, id]);
            if (dup.rows[0]) { await client.query("ROLLBACK"); return res.status(409).json({ error: "ISBN must be unique." }); }
        }

        const authorId = author ? await getOrCreateLookup(client, "authors", author) : existing.rows[0].author_id;
        const publisherId = publisher ? await getOrCreateLookup(client, "publishers", publisher) : existing.rows[0].publisher_id;
        const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : existing.rows[0].cover_image_url;

        await client.query(
            `UPDATE books SET isbn = COALESCE($1, isbn), title = COALESCE($2, title), author_id = $3,
       publisher_id = $4, category_id = COALESCE($5, category_id), publication_year = COALESCE($6, publication_year),
       cover_image_url = $7 WHERE id = $8`, [isbn, title, authorId, publisherId, categoryId, publicationYear, coverImageUrl, id]
        );

        // Adjust copy count if totalCopies changed
        if (totalCopies !== undefined) {
            const currentCopies = await client.query("SELECT id FROM book_copies WHERE book_id = $1 ORDER BY copy_number", [id]);
            const target = Math.max(1, Number(totalCopies));
            const diff = target - currentCopies.rows.length;
            if (diff > 0) {
                const maxNumRes = await client.query("SELECT COALESCE(MAX(copy_number),0) AS m FROM book_copies WHERE book_id = $1", [id]);
                let nextNum = maxNumRes.rows[0].m + 1;
                for (let i = 0; i < diff; i++) {
                    await client.query("INSERT INTO book_copies (book_id, copy_number, status) VALUES ($1,$2,'available')", [id, nextNum++]);
                }
            } else if (diff < 0) {
                const removable = await client.query(
                    "SELECT id FROM book_copies WHERE book_id = $1 AND status = 'available' ORDER BY copy_number DESC LIMIT $2", [id, -diff]
                );
                for (const row of removable.rows) await client.query("DELETE FROM book_copies WHERE id = $1", [row.id]);
            }
            await client.query("UPDATE books SET total_copies = (SELECT COUNT(*) FROM book_copies WHERE book_id = $1) WHERE id = $1", [id]);
        }

        await client.query("COMMIT");
        res.json({ message: "Book updated." });
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function deleteBook(req, res) {
    const { id } = req.params;
    const hasHistory = await pool.query("SELECT 1 FROM borrowings WHERE book_id = $1 LIMIT 1", [id]);
    if (hasHistory.rows[0]) {
        // Soft delete: preserve historical borrowing records.
        await pool.query("UPDATE books SET is_deleted = true WHERE id = $1", [id]);
    } else {
        await pool.query("DELETE FROM book_copies WHERE book_id = $1", [id]);
        await pool.query("DELETE FROM books WHERE id = $1", [id]);
    }
    res.json({ message: "Book removed." });
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook };