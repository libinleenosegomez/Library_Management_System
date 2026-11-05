ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_no VARCHAR(50);

ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50);
ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS department VARCHAR(120);
ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS account_no VARCHAR(50);

CREATE TABLE IF NOT EXISTS borrow_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID NOT NULL REFERENCES books(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP NOT NULL DEFAULT now(),
  decided_at  TIMESTAMP,
  decided_by  UUID REFERENCES users(id),
  borrowing_id UUID UNIQUE REFERENCES borrowings(id)
);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_user ON borrow_requests(user_id, requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_book_request ON borrow_requests(book_id, user_id) WHERE status = 'pending';