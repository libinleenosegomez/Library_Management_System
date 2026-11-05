const pool = require("../config/db");

async function dashboardStats(req, res) {
  const [books, students, borrowedNow, overdueNow, unpaidFines, borrowsByDay, mostBorrowed, activeUsers, recentActivity, recentBooks] = await Promise.all([
    pool.query("SELECT COALESCE(SUM(total_copies),0) AS total, COALESCE(SUM(total_copies) - (SELECT COUNT(*) FROM book_copies bc JOIN books b2 ON b2.id = bc.book_id WHERE bc.status='borrowed' AND b2.is_deleted=false),0) AS available FROM books WHERE is_deleted = false"),
    pool.query("SELECT COUNT(*) FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='student'"),
    pool.query("SELECT COUNT(*) FROM borrowings WHERE status='borrowed'"),
    pool.query("SELECT COUNT(*) FROM borrowings WHERE status='borrowed' AND due_date < CURRENT_DATE"),
    pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM fines WHERE status='unpaid'"),
    pool.query(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(cnt,0)::int AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN (SELECT borrow_date, COUNT(*) cnt FROM borrowings GROUP BY borrow_date) b ON b.borrow_date = d::date
    `),
    pool.query(`
      SELECT b.title, COUNT(*)::int AS count FROM borrowings bo JOIN books b ON b.id = bo.book_id
      GROUP BY b.title ORDER BY count DESC LIMIT 5
    `),
    pool.query(`
      SELECT u.name, COUNT(*)::int AS count FROM borrowings bo JOIN users u ON u.id = bo.user_id
      GROUP BY u.name ORDER BY count DESC LIMIT 5
    `),
    pool.query(`
      SELECT bo.id, b.title, u.name AS user_name, bo.status, bo.borrow_date, bo.return_date
      FROM borrowings bo JOIN books b ON b.id = bo.book_id JOIN users u ON u.id = bo.user_id
      ORDER BY COALESCE(bo.return_date, bo.borrow_date) DESC LIMIT 6
    `),
    pool.query(`SELECT title, created_at FROM books WHERE is_deleted = false ORDER BY created_at DESC LIMIT 5`),
  ]);

  res.json({
    totalBooks: Number(books.rows[0].total),
    availableBooks: Number(books.rows[0].available),
    totalStudents: Number(students.rows[0].count),
    borrowedNow: Number(borrowedNow.rows[0].count),
    overdueNow: Number(overdueNow.rows[0].count),
    unpaidFines: Number(unpaidFines.rows[0].total),
    borrowsByDay: borrowsByDay.rows,
    mostBorrowed: mostBorrowed.rows,
    activeUsers: activeUsers.rows,
    recentActivity: recentActivity.rows,
    recentBooks: recentBooks.rows,
  });
}

const REPORT_QUERIES = {
  inventory: `SELECT b.title, a.name AS author, c.name AS category, b.isbn, b.total_copies,
                (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id=b.id AND bc.status='available') AS available
              FROM books b JOIN authors a ON a.id=b.author_id JOIN categories c ON c.id=b.category_id
              WHERE b.is_deleted=false ORDER BY b.title`,
  borrowing: `SELECT b.title, u.name AS student, bo.borrow_date, bo.due_date, bo.status
              FROM borrowings bo JOIN books b ON b.id=bo.book_id JOIN users u ON u.id=bo.user_id
              ORDER BY bo.borrow_date DESC`,
  returns: `SELECT b.title, u.name AS student, bo.return_date,
              GREATEST(0, bo.return_date - bo.due_date) AS days_late
            FROM borrowings bo JOIN books b ON b.id=bo.book_id JOIN users u ON u.id=bo.user_id
            WHERE bo.status='returned' ORDER BY bo.return_date DESC`,
  overdue: `SELECT b.title, u.name AS student, bo.due_date, (CURRENT_DATE - bo.due_date) AS days_overdue
            FROM borrowings bo JOIN books b ON b.id=bo.book_id JOIN users u ON u.id=bo.user_id
            WHERE bo.status='borrowed' AND bo.due_date < CURRENT_DATE ORDER BY days_overdue DESC`,
  fines: `SELECT u.name AS student, b.title, f.amount, f.status, f.fine_date
          FROM fines f JOIN users u ON u.id=f.user_id JOIN borrowings bo ON bo.id=f.borrowing_id JOIN books b ON b.id=bo.book_id
          ORDER BY f.fine_date DESC`,
  activity: `SELECT u.name AS student,
              (SELECT COUNT(*) FROM borrowings bo WHERE bo.user_id=u.id)::int AS total_borrowed,
              (SELECT COUNT(*) FROM borrowings bo WHERE bo.user_id=u.id AND bo.status='borrowed')::int AS currently_out,
              (SELECT COALESCE(SUM(amount),0) FROM fines f WHERE f.user_id=u.id AND f.status='unpaid') AS unpaid_fines
            FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='student' ORDER BY u.name`,
  popular: `SELECT b.title, COUNT(*)::int AS times_borrowed FROM borrowings bo JOIN books b ON b.id=bo.book_id
            GROUP BY b.title ORDER BY times_borrowed DESC`,
};

async function getReport(req, res) {
  const { type } = req.params;
  const query = REPORT_QUERIES[type];
  if (!query) return res.status(400).json({ error: "Unknown report type." });
  const result = await pool.query(query);
  res.json({ report: type, rows: result.rows });
}

module.exports = { dashboardStats, getReport };
