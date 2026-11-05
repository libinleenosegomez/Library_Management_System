# Don Bosco College Library — Library Management System

A complete, full-stack Library Management System:

- **Backend:** Node.js + Express + PostgreSQL (REST API, JWT auth, real relational schema)
- **Frontend:** Next.js (React) + Tailwind CSS

Two user roles are supported: **Admin/Librarian** (full control) and **Student** (browse, borrow, reserve, track fines).

---

## 1. Required software

- **Node.js** 18+ and npm (comes with Node) — [nodejs.org](https://nodejs.org)
- **PostgreSQL** 14+ — [postgresql.org/download](https://www.postgresql.org/download/)
- A terminal / shell

Check versions:
```bash
node -v
npm -v
psql --version
```

---

## 2. Database setup

Start PostgreSQL, then create a database and user (adjust names/password as you like):

```bash
psql -U postgres
```
```sql
CREATE DATABASE lms_db;
CREATE USER lms_user WITH ENCRYPTED PASSWORD 'lms_password';
GRANT ALL PRIVILEGES ON DATABASE lms_db TO lms_user;
\q
```

---

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set at minimum:
```
DATABASE_URL=postgresql://lms_user:lms_password@localhost:5432/lms_db
JWT_SECRET=<a long random string — e.g. output of `openssl rand -hex 32`>
```

Run the database migration (creates all tables, indexes, constraints):
```bash
npm run migrate
```

Seed sample data (20+ books, categories, an admin account, 4 student accounts, sample borrowings/fines/reservations):
```bash
npm run seed
```

Start the API server:
```bash
npm run dev      # auto-restarts on file changes (nodemon)
# or
npm start        # plain node
```

The API listens on `http://localhost:4000` by default. Check it's alive:
```bash
curl http://localhost:4000/api/health
```

### Default login credentials (created by `npm run seed`)
| Role    | Email                        | Password    |
|---------|-------------------------------|-------------|
| Admin   | admin@library.edu            | admin123    |
| Student | aditi.sharma@student.edu     | student123  |

**Creating your own first admin account** (instead of using the seeded one): register a normal account via the frontend's "Create an account" page (or `POST /api/auth/register`), then promote it to admin directly in the database:
```sql
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE email = 'you@example.com';
```

---

## 4. Frontend setup

In a second terminal:
```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Confirm `.env.local` points at your running backend:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Start the frontend:
```bash
npm run dev
```

Open **http://localhost:3000** — you'll land on the login page.

---

## 5. What's implemented

- **Auth:** register, login, logout, forgot/reset password (demo-mode: the reset code is shown on screen instead of emailed — wire up a real mail provider such as Postmark/SES before production use), role-based access control, JWT sessions, rate limiting on auth endpoints.
- **Admin dashboard:** live stats (total/available/borrowed/overdue books, students, unpaid fines) and charts (borrowing activity, most borrowed books, most active users, on-time vs overdue).
- **Book management:** add/edit/delete (soft-delete preserves history), cover image upload, ISBN uniqueness enforcement, per-copy availability tracking via a real `book_copies` table, search/filter/sort, and per-book borrower history.
- **Category management:** create/edit/delete with book counts; deletion blocked while books reference a category.
- **User management:** search, view full profile (borrowing history + fines), edit, activate/deactivate, and let admins create student or admin logins with passwords and student ledger details (admission number, department, and account number).
- **Borrowing/return:** students submit requests for admin approval; approval transactionally issues an available copy and snapshots ledger details with borrow/due/return dates. Admins can reject requests or issue a book manually. Limits and copy availability are enforced during issuance.
- **Reservations:** students reserve unavailable books; returning a book automatically notifies the next person in the reservation queue.
- **Fines:** auto-calculated on return (configurable ₹/day and loan period), admin can mark paid or waive, full payment history.
- **Notifications:** in-app, generated for borrow/return/overdue/fine/reservation-available events.
- **Reports:** inventory, borrowing, returns, overdue, fines, user activity, most-borrowed — each exportable as CSV, plus a print/Save-as-PDF button.
- **Security:** bcrypt password hashing, helmet, CORS restricted to the frontend origin, express-validator input validation, parameterized SQL everywhere (no injection surface), restricted file uploads (type + size), centralized error handling that never leaks internals.

---

## 6. Project structure

```
backend/
  src/
    config/db.js            PostgreSQL connection pool
    middleware/              auth, validation, rate limiting, uploads, error handling
    controllers/              one per resource (books, users, borrowings, fines, ...)
    routes/                    Express routers, wired with validation + auth middleware
    db/migrations/                 versioned schema, including borrowing requests and ledger fields
    db/migrate.js, db/seed.js   migration runner + sample data loader
    app.js, server.js
frontend/
  src/
    pages/                    Next.js pages (login, admin/*, student/*)
    components/                Layout (sidebar/topbar), shared UI atoms
    context/AuthContext.js     session state + login/register/logout
    lib/api.js                  axios client with JWT injection
```

---

## 7. Testing notes

This system was built and verified against a real PostgreSQL instance during development:
migrations and seed data were run successfully, and the following flows were exercised directly
against the live API: login for both roles, book search/filter, borrowing with max-books-limit
enforcement, ISBN-uniqueness rejection, returns with correct overdue-fine calculation, reservation
queueing and automatic fulfillment notifications on return, and fine payment. The Next.js frontend
was verified to build cleanly and serve all 21 routes. Before relying on this in production, run
through the full click-through flows in a browser once more and add an automated test suite
(e.g. Jest + Supertest for the API, Playwright for the frontend) — none is included here.

## 8. Taking this to production

- Replace the demo password-reset flow with real email delivery.
- Move the JWT out of `localStorage` into an httpOnly cookie set by the server, to reduce XSS exposure.
- Put the app behind HTTPS and set `NODE_ENV=production`.
- Consider a proper migration tool (e.g. `node-pg-migrate`) if the schema will keep evolving.
- Add automated tests and CI.
