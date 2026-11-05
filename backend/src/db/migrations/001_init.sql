-- Library Management System — initial schema
-- Uses pgcrypto for gen_random_uuid()

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('admin', 'student'))
);
INSERT INTO roles (name) VALUES ('admin'), ('student') ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  max_books     INTEGER NOT NULL DEFAULT 3,
  reset_code    VARCHAR(10),
  reset_code_expires TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- ---------------------------------------------------------------------------
-- Categories, Authors, Publishers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS authors (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS publishers (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) UNIQUE NOT NULL
);

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn              VARCHAR(20) UNIQUE NOT NULL,
  title             VARCHAR(300) NOT NULL,
  author_id         UUID NOT NULL REFERENCES authors(id),
  publisher_id      UUID NOT NULL REFERENCES publishers(id),
  category_id       UUID NOT NULL REFERENCES categories(id),
  publication_year  INTEGER NOT NULL,
  total_copies      INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  cover_image_url   TEXT,
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  added_by          UUID REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);

-- Individual physical copies of a book (enables real per-copy availability tracking)
CREATE TABLE IF NOT EXISTS book_copies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  copy_number INTEGER NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'lost', 'damaged')),
  UNIQUE (book_id, copy_number)
);
CREATE INDEX IF NOT EXISTS idx_book_copies_book_status ON book_copies(book_id, status);

-- ---------------------------------------------------------------------------
-- Borrowings + Returns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS borrowings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_copy_id  UUID NOT NULL REFERENCES book_copies(id),
  book_id       UUID NOT NULL REFERENCES books(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  borrow_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE NOT NULL,
  return_date   DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned')),
  issued_by     UUID REFERENCES users(id),
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_borrowings_user ON borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_book ON borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
-- Prevent duplicate ACTIVE borrowing records for the same copy
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_borrowing_per_copy
  ON borrowings(book_copy_id) WHERE (status = 'borrowed');

CREATE TABLE IF NOT EXISTS returns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID UNIQUE NOT NULL REFERENCES borrowings(id),
  return_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  processed_by UUID REFERENCES users(id),
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      UUID NOT NULL REFERENCES books(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  reserve_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'available', 'cancelled', 'fulfilled')),
  notified_at  TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservations_book ON reservations(book_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);

-- ---------------------------------------------------------------------------
-- Fines + Payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES borrowings(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status       VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'waived')),
  reason       TEXT,
  fine_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_date    DATE,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fines_user ON fines(user_id, status);

CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_id      UUID NOT NULL REFERENCES fines(id),
  amount       NUMERIC(10,2) NOT NULL,
  method       VARCHAR(30) NOT NULL DEFAULT 'cash',
  processed_by UUID REFERENCES users(id),
  paid_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  type       VARCHAR(30) NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ---------------------------------------------------------------------------
-- Settings (single-row table for configurable business rules)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  loan_days          INTEGER NOT NULL DEFAULT 14,
  fine_per_day       NUMERIC(10,2) NOT NULL DEFAULT 5,
  max_books_default  INTEGER NOT NULL DEFAULT 3
);
INSERT INTO settings (id, loan_days, fine_per_day, max_books_default)
VALUES (1, 14, 5, 3) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
