require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const CATEGORIES = ["Computer Science", "Mathematics", "Science", "Literature", "History", "Commerce"];

const BOOKS = [
  ["Introduction to Algorithms", "Thomas H. Cormen", "Computer Science", "MIT Press", 2009, "9780262033848", 4],
  ["Clean Code", "Robert C. Martin", "Computer Science", "Prentice Hall", 2008, "9780132350884", 3],
  ["Design Patterns", "Erich Gamma", "Computer Science", "Addison-Wesley", 1994, "9780201633610", 2],
  ["Database System Concepts", "Abraham Silberschatz", "Computer Science", "McGraw-Hill", 2019, "9780078022159", 3],
  ["Linear Algebra and Its Applications", "Gilbert Strang", "Mathematics", "Cengage", 2016, "9780030105678", 3],
  ["Calculus", "James Stewart", "Mathematics", "Cengage", 2015, "9781285740621", 4],
  ["Discrete Mathematics and Its Applications", "Kenneth Rosen", "Mathematics", "McGraw-Hill", 2018, "9781259676512", 2],
  ["Probability and Statistics", "Morris DeGroot", "Mathematics", "Pearson", 2011, "9780321500465", 2],
  ["A Brief History of Time", "Stephen Hawking", "Science", "Bantam Books", 1988, "9780553380163", 3],
  ["The Selfish Gene", "Richard Dawkins", "Science", "Oxford University Press", 1976, "9780198788607", 2],
  ["Cosmos", "Carl Sagan", "Science", "Random House", 1980, "9780345539434", 2],
  ["Physics for Scientists and Engineers", "Raymond Serway", "Science", "Cengage", 2018, "9781337553278", 3],
  ["Pride and Prejudice", "Jane Austen", "Literature", "Penguin Classics", 1813, "9780141439518", 3],
  ["1984", "George Orwell", "Literature", "Secker & Warburg", 1949, "9780451524935", 4],
  ["To Kill a Mockingbird", "Harper Lee", "Literature", "J.B. Lippincott", 1960, "9780061120084", 3],
  ["The Great Gatsby", "F. Scott Fitzgerald", "Literature", "Charles Scribner's Sons", 1925, "9780743273565", 2],
  ["Sapiens", "Yuval Noah Harari", "History", "Harper", 2015, "9780062316097", 3],
  ["A People's History of the United States", "Howard Zinn", "History", "Harper Perennial", 1980, "9780061965586", 2],
  ["Guns, Germs, and Steel", "Jared Diamond", "History", "W. W. Norton", 1997, "9780393317558", 2],
  ["Principles of Economics", "N. Gregory Mankiw", "Commerce", "Cengage", 2020, "9780357038314", 3],
  ["The Wealth of Nations", "Adam Smith", "Commerce", "W. Strahan", 1776, "9780486290895", 2],
  ["Rich Dad Poor Dad", "Robert Kiyosaki", "Commerce", "Plata Publishing", 1997, "9781612680194", 4],
];

const STUDENTS = [
  ["Aditi Sharma", "aditi.sharma@student.edu", "active"],
  ["Rahul Verma", "rahul.verma@student.edu", "active"],
  ["Priya Nair", "priya.nair@student.edu", "active"],
  ["Karthik Iyer", "karthik.iyer@student.edu", "inactive"],
];

async function upsertLookup(table, name) {
  const existing = await pool.query(`SELECT id FROM ${table} WHERE name = $1`, [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await pool.query(`INSERT INTO ${table} (name) VALUES ($1) RETURNING id`, [name]);
  return inserted.rows[0].id;
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding roles / settings already handled by migration.");

    const roleRes = await client.query("SELECT id, name FROM roles");
    const roleId = (name) => roleRes.rows.find((r) => r.name === name).id;

    // --- users ---
    const adminPw = await bcrypt.hash("admin123", 10);
    const studentPw = await bcrypt.hash("student123", 10);

    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role_id, status, max_books)
       VALUES ($1,$2,$3,$4,'active', 99)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["Admin Librarian", "admin@library.edu", adminPw, roleId("admin")]
    );
    const adminId = adminRes.rows[0].id;

    const studentIds = {};
    for (const [name, email, status] of STUDENTS) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role_id, status, max_books)
         VALUES ($1,$2,$3,$4,$5,3)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name, email, studentPw, roleId("student"), status]
      );
      studentIds[name] = res.rows[0].id;
    }

    // --- categories ---
    const categoryIds = {};
    for (const name of CATEGORIES) categoryIds[name] = await upsertLookup("categories", name);

    // --- books (+ authors, publishers, book_copies) ---
    const bookIds = {};
    for (const [title, author, category, publisher, year, isbn, copies] of BOOKS) {
      const authorId = await upsertLookup("authors", author);
      const publisherId = await upsertLookup("publishers", publisher);

      let bookRes = await client.query("SELECT id FROM books WHERE isbn = $1", [isbn]);
      let bookId;
      if (bookRes.rows[0]) {
        bookId = bookRes.rows[0].id;
      } else {
        const inserted = await client.query(
          `INSERT INTO books (isbn, title, author_id, publisher_id, category_id, publication_year, total_copies, added_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [isbn, title, authorId, publisherId, categoryIds[category], year, copies, adminId]
        );
        bookId = inserted.rows[0].id;
        for (let i = 1; i <= copies; i++) {
          await client.query(
            `INSERT INTO book_copies (book_id, copy_number, status) VALUES ($1,$2,'available')`,
            [bookId, i]
          );
        }
      }
      bookIds[title] = bookId;
    }

    // --- sample borrowings / returns / fines / reservations / notifications ---
    const borrowBook = async (title, studentName, borrowDaysAgo, returnedExtraDays) => {
      const bookId = bookIds[title];
      const userId = studentIds[studentName];
      const copyRes = await client.query(
        `SELECT id FROM book_copies WHERE book_id = $1 AND status = 'available' LIMIT 1`,
        [bookId]
      );
      if (!copyRes.rows[0]) return;
      const copyId = copyRes.rows[0].id;
      await client.query(`UPDATE book_copies SET status = 'borrowed' WHERE id = $1`, [copyId]);

      const borrowDate = `CURRENT_DATE - INTERVAL '${borrowDaysAgo} days'`;
      const dueDateSql = `(CURRENT_DATE - INTERVAL '${borrowDaysAgo} days' + INTERVAL '14 days')`;
      const borRes = await client.query(
        `INSERT INTO borrowings (book_copy_id, book_id, user_id, borrow_date, due_date, issued_by)
         VALUES ($1,$2,$3, ${borrowDate}, ${dueDateSql}, $4) RETURNING id, due_date`,
        [copyId, bookId, userId, adminId]
      );
      const borrowingId = borRes.rows[0].id;

      if (returnedExtraDays !== undefined) {
        const returnDateSql = `((CURRENT_DATE - INTERVAL '${borrowDaysAgo} days' + INTERVAL '14 days') + INTERVAL '${returnedExtraDays} days')`;
        await client.query(
          `UPDATE borrowings SET return_date = ${returnDateSql}, status = 'returned' WHERE id = $1`,
          [borrowingId]
        );
        await client.query(`UPDATE book_copies SET status = 'available' WHERE id = $1`, [copyId]);
        await client.query(
          `INSERT INTO returns (borrowing_id, return_date, processed_by) VALUES ($1, ${returnDateSql}, $2)`,
          [borrowingId, adminId]
        );
        const overdueCheck = await client.query(
          `SELECT GREATEST(0, (${returnDateSql}::date - due_date))::int AS overdue_days, due_date FROM borrowings WHERE id = $1`,
          [borrowingId]
        );
        const overdueDays = overdueCheck.rows[0].overdue_days;
        if (overdueDays > 0) {
          await client.query(
            `INSERT INTO fines (borrowing_id, user_id, amount, status, reason, fine_date)
             VALUES ($1,$2,$3,'unpaid',$4, ${returnDateSql})`,
            [borrowingId, userId, overdueDays * 5, `Returned ${overdueDays} day(s) late`]
          );
        }
      }
    };

    await borrowBook("Clean Code", "Aditi Sharma", 5);
    await borrowBook("1984", "Aditi Sharma", 20); // currently overdue
    await borrowBook("Sapiens", "Rahul Verma", 3);
    await borrowBook("Cosmos", "Rahul Verma", 30, 4); // returned late -> fine
    await borrowBook("Pride and Prejudice", "Priya Nair", 8);
    await borrowBook("Principles of Economics", "Priya Nair", 40, -3); // returned early, no fine
    await borrowBook("The Great Gatsby", "Aditi Sharma", 60, 6); // returned late -> fine

    // reservation: make "Guns, Germs, and Steel" fully unavailable via real borrowings
    // (both of its copies borrowed by other students), then Rahul reserves it.
    await borrowBook("Guns, Germs, and Steel", "Aditi Sharma", 2);
    await borrowBook("Guns, Germs, and Steel", "Priya Nair", 1);
    const gunsId = bookIds["Guns, Germs, and Steel"];
    await client.query(
      `INSERT INTO reservations (book_id, user_id, status) VALUES ($1,$2,'waiting')`,
      [gunsId, studentIds["Rahul Verma"]]
    );

    // notifications
    await client.query(
      `INSERT INTO notifications (user_id, type, message) VALUES
       ($1, 'overdue', '"1984" is overdue. Please return it to avoid further fines.'),
       ($2, 'fine', 'A fine of ₹20 was generated for "Cosmos".'),
       ($3, 'system', 'Welcome to the Library Admin Console.')`,
      [studentIds["Aditi Sharma"], studentIds["Rahul Verma"], adminId]
    );

    console.log("✓ Seed data inserted successfully.");
    console.log("  Admin login:   admin@library.edu / admin123");
    console.log("  Student login: aditi.sharma@student.edu / student123");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
