const pool = require("../config/db");
const { daysOverdue } = require("../utils/fines");

async function listBorrowings(req, res) {
    const { status, userId } = req.query;
    let sql = `
        SELECT bo.id, bo.book_id, b.title, bo.user_id, u.name AS user_name, bo.admission_no, bo.department, bo.account_no,
          bo.borrow_date, bo.due_date, bo.return_date, bo.status
    FROM borrowings bo
    JOIN books b ON b.id = bo.book_id
    JOIN users u ON u.id = bo.user_id
    WHERE 1=1
  `;
    const params = [];
    // Admins can view all; students only their own.
    if (req.user.role !== "admin") {
        params.push(req.user.id);
        sql += ` AND bo.user_id = $${params.length}`;
    } else if (userId) {
        params.push(userId);
        sql += ` AND bo.user_id = $${params.length}`;
    }

    if (status === "returned") sql += " AND bo.status = 'returned'";
    if (status === "borrowed") sql += " AND bo.status = 'borrowed' AND bo.due_date >= CURRENT_DATE";
    if (status === "overdue") sql += " AND bo.status = 'borrowed' AND bo.due_date < CURRENT_DATE";

    sql += " ORDER BY bo.borrow_date DESC";
    const result = await pool.query(sql, params);
    res.json({ borrowings: result.rows });
}

async function listRequests(req, res) {
    const status = req.query.status || "pending";
    const params = [];
    let sql = `SELECT br.id, br.book_id, b.title, br.user_id, u.name AS user_name, u.email,
                    u.admission_no, u.department, u.account_no, br.status, br.requested_at
             FROM borrow_requests br JOIN books b ON b.id = br.book_id
             JOIN users u ON u.id = br.user_id`;
    if (req.user.role !== "admin") {
        params.push(req.user.id);
        sql += ` WHERE br.user_id = $${params.length}`;
        if (status !== "all") {
            params.push(status);
            sql += ` AND br.status = $${params.length}`;
        }
    } else if (status !== "all") {
        params.push(status);
        sql += ` WHERE br.status = $${params.length}`;
    }
    sql += " ORDER BY br.requested_at DESC";
    const result = await pool.query(sql, params);
    res.json({ requests: result.rows });
}

async function requestBook(req, res) {
    const { bookId } = req.body;
    const bookRes = await pool.query("SELECT id, title FROM books WHERE id = $1 AND is_deleted = false", [bookId]);
    if (!bookRes.rows[0]) return res.status(404).json({ error: "Book not found." });
    const pending = await pool.query(
        "SELECT id FROM borrow_requests WHERE user_id = $1 AND book_id = $2 AND status = 'pending'", [req.user.id, bookId]
    );
    if (pending.rows[0]) return res.status(409).json({ error: "You already have a pending request for this book." });
    const alreadyBorrowed = await pool.query(
        "SELECT id FROM borrowings WHERE user_id = $1 AND book_id = $2 AND status = 'borrowed'", [req.user.id, bookId]
    );
    if (alreadyBorrowed.rows[0]) return res.status(409).json({ error: "You already have this book borrowed." });
    const result = await pool.query(
        "INSERT INTO borrow_requests (book_id, user_id) VALUES ($1,$2) RETURNING id, status, requested_at", [bookId, req.user.id]
    );
    const admins = await pool.query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin' AND u.status = 'active'");
    for (const admin of admins.rows) {
        await pool.query("INSERT INTO notifications (user_id, type, message) VALUES ($1,'borrow_request',$2)", [admin.id, `${req.user.name} requested \"${bookRes.rows[0].title}\".`]);
    }
    res.status(201).json({ message: "Request sent to the librarian for approval.", request: result.rows[0] });
}

async function decideRequest(req, res) {
    const { decision } = req.body;
    if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ error: "Decision must be approved or rejected." });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const requestRes = await client.query(
            `SELECT br.*, u.name, u.status AS user_status, u.max_books, u.admission_no, u.department, u.account_no
       FROM borrow_requests br JOIN users u ON u.id = br.user_id WHERE br.id = $1 FOR UPDATE OF br, u`, [req.params.id]
        );
        const request = requestRes.rows[0];
        if (!request) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Request not found." }); }
        if (request.status !== "pending") { await client.query("ROLLBACK"); return res.status(409).json({ error: "This request has already been decided." }); }
        if (decision === "rejected") {
            await client.query("UPDATE borrow_requests SET status = 'rejected', decided_at = now(), decided_by = $1 WHERE id = $2", [req.user.id, request.id]);
            await client.query("INSERT INTO notifications (user_id, type, message) VALUES ($1,'borrow_request',$2)", [request.user_id, "Your book request was declined by the librarian."]);
            await client.query("COMMIT");
            return res.json({ message: "Request rejected." });
        }
        if (request.user_status === "inactive") { await client.query("ROLLBACK"); return res.status(403).json({ error: "This account is deactivated." }); }
        const activeCount = await client.query("SELECT COUNT(*) FROM borrowings WHERE user_id = $1 AND status = 'borrowed'", [request.user_id]);
        if (Number(activeCount.rows[0].count) >= request.max_books) { await client.query("ROLLBACK"); return res.status(400).json({ error: `Borrow limit reached (${request.max_books} books).` }); }
        const duplicate = await client.query("SELECT 1 FROM borrowings WHERE user_id = $1 AND book_id = $2 AND status = 'borrowed'", [request.user_id, request.book_id]);
        if (duplicate.rows[0]) { await client.query("ROLLBACK"); return res.status(409).json({ error: "This student already has this book borrowed." }); }
        const copyRes = await client.query(
            "SELECT id FROM book_copies WHERE book_id = $1 AND status = 'available' ORDER BY copy_number LIMIT 1 FOR UPDATE SKIP LOCKED", [request.book_id]
        );
        if (!copyRes.rows[0]) { await client.query("ROLLBACK"); return res.status(400).json({ error: "No copies are currently available." }); }
        const settingsRes = await client.query("SELECT loan_days FROM settings WHERE id = 1");
        const borrowingRes = await client.query(
            `INSERT INTO borrowings (book_copy_id, book_id, user_id, due_date, issued_by, admission_no, department, account_no)
       VALUES ($1,$2,$3,CURRENT_DATE + ($4 || ' days')::interval,$5,$6,$7,$8) RETURNING id, due_date`, [copyRes.rows[0].id, request.book_id, request.user_id, settingsRes.rows[0].loan_days, req.user.id, request.admission_no, request.department, request.account_no]
        );
        await client.query("UPDATE book_copies SET status = 'borrowed' WHERE id = $1", [copyRes.rows[0].id]);
        await client.query("UPDATE borrow_requests SET status = 'approved', decided_at = now(), decided_by = $1, borrowing_id = $2 WHERE id = $3", [req.user.id, borrowingRes.rows[0].id, request.id]);
        const bookRes = await client.query("SELECT title FROM books WHERE id = $1", [request.book_id]);
        await client.query("INSERT INTO notifications (user_id, type, message) VALUES ($1,'borrow',$2)", [request.user_id, `Your request for \"${bookRes.rows[0].title}\" was approved. Due ${borrowingRes.rows[0].due_date.toISOString().slice(0,10)}.`]);
        await client.query("COMMIT");
        res.json({ message: "Request approved and book issued.", borrowing: borrowingRes.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

// Borrow a book — used both by a student borrowing for themself, and by an
// admin issuing a book manually on behalf of a student.
async function borrowBook(req, res) {
    const { bookId, userId } = req.body;
    const targetUserId = req.user.role === "admin" ? (userId || req.user.id) : req.user.id;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const userRes = await client.query("SELECT max_books, status, admission_no, department, account_no FROM users WHERE id = $1 FOR UPDATE", [targetUserId]);
        if (!userRes.rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "User not found." }); }
        if (userRes.rows[0].status === "inactive") { await client.query("ROLLBACK"); return res.status(403).json({ error: "This account is deactivated." }); }

        const activeCountRes = await client.query("SELECT COUNT(*) FROM borrowings WHERE user_id = $1 AND status = 'borrowed'", [targetUserId]);
        if (Number(activeCountRes.rows[0].count) >= userRes.rows[0].max_books) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: `Borrow limit reached (${userRes.rows[0].max_books} books).` });
        }

        const dupRes = await client.query(
            "SELECT 1 FROM borrowings WHERE user_id = $1 AND book_id = $2 AND status = 'borrowed'", [targetUserId, bookId]
        );
        if (dupRes.rows[0]) { await client.query("ROLLBACK"); return res.status(400).json({ error: "This user already has this book borrowed." }); }

        // Lock and grab an available copy
        const copyRes = await client.query(
            "SELECT id FROM book_copies WHERE book_id = $1 AND status = 'available' ORDER BY copy_number LIMIT 1 FOR UPDATE SKIP LOCKED", [bookId]
        );
        if (!copyRes.rows[0]) { await client.query("ROLLBACK"); return res.status(400).json({ error: "No copies available — reserve it instead." }); }
        const copyId = copyRes.rows[0].id;

        await client.query("UPDATE book_copies SET status = 'borrowed' WHERE id = $1", [copyId]);

        const settingsRes = await client.query("SELECT loan_days FROM settings WHERE id = 1");
        const loanDays = settingsRes.rows[0].loan_days;

        const borRes = await client.query(
            `INSERT INTO borrowings (book_copy_id, book_id, user_id, due_date, issued_by, admission_no, department, account_no)
       VALUES ($1,$2,$3, CURRENT_DATE + ($4 || ' days')::interval, $5, $6, $7, $8)
       RETURNING id, due_date`, [copyId, bookId, targetUserId, loanDays, req.user.id, userRes.rows[0].admission_no, userRes.rows[0].department, userRes.rows[0].account_no]
        );

        const bookRes = await client.query("SELECT title FROM books WHERE id = $1", [bookId]);
        await client.query(
            `INSERT INTO notifications (user_id, type, message) VALUES ($1,'borrow',$2)`, [targetUserId, `You borrowed "${bookRes.rows[0].title}". Due ${borRes.rows[0].due_date.toISOString().slice(0,10)}.`]
        );

        await client.query("COMMIT");
        res.status(201).json({ message: "Book borrowed.", borrowing: borRes.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function returnBook(req, res) {
    const { id } = req.params; // borrowing id
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const borRes = await client.query("SELECT * FROM borrowings WHERE id = $1 FOR UPDATE", [id]);
        const borrowing = borRes.rows[0];
        if (!borrowing) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Borrowing record not found." }); }
        if (borrowing.status === "returned") { await client.query("ROLLBACK"); return res.status(400).json({ error: "This book was already returned." }); }

        await client.query("UPDATE borrowings SET return_date = CURRENT_DATE, status = 'returned' WHERE id = $1", [id]);
        await client.query("UPDATE book_copies SET status = 'available' WHERE id = $1", [borrowing.book_copy_id]);
        await client.query(
            "INSERT INTO returns (borrowing_id, return_date, processed_by) VALUES ($1, CURRENT_DATE, $2)", [id, req.user.id]
        );

        const overdueDays = daysOverdue(borrowing.due_date, new Date());
        const bookRes = await client.query("SELECT title FROM books WHERE id = $1", [borrowing.book_id]);
        let fine = null;
        if (overdueDays > 0) {
            const settingsRes = await client.query("SELECT fine_per_day FROM settings WHERE id = 1");
            const amount = overdueDays * Number(settingsRes.rows[0].fine_per_day);
            const fineRes = await client.query(
                `INSERT INTO fines (borrowing_id, user_id, amount, status, reason)
         VALUES ($1,$2,$3,'unpaid',$4) RETURNING id, amount`, [id, borrowing.user_id, amount, `Returned ${overdueDays} day(s) late`]
            );
            fine = fineRes.rows[0];
            await client.query(
                "INSERT INTO notifications (user_id, type, message) VALUES ($1,'fine',$2)", [borrowing.user_id, `A fine of ₹${amount} was generated for "${bookRes.rows[0].title}".`]
            );
        }
        await client.query(
            "INSERT INTO notifications (user_id, type, message) VALUES ($1,'return',$2)", [borrowing.user_id, `"${bookRes.rows[0].title}" was marked returned.`]
        );

        // Notify next person in the reservation queue, if any
        const nextRes = await client.query(
            "SELECT id, user_id FROM reservations WHERE book_id = $1 AND status = 'waiting' ORDER BY reserve_date LIMIT 1 FOR UPDATE", [borrowing.book_id]
        );
        if (nextRes.rows[0]) {
            await client.query("UPDATE reservations SET status = 'available', notified_at = now() WHERE id = $1", [nextRes.rows[0].id]);
            await client.query(
                "INSERT INTO notifications (user_id, type, message) VALUES ($1,'reservation',$2)", [nextRes.rows[0].user_id, `"${bookRes.rows[0].title}" is now available for you to borrow.`]
            );
        }

        await client.query("COMMIT");
        res.json({ message: "Book returned.", overdueDays, fine });
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { listBorrowings, listRequests, requestBook, decideRequest, borrowBook, returnBook };