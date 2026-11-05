# Library Management System Features

## Student Features

- Create an account, sign in, and manage a library session.
- Browse and search the catalog by title, author, ISBN, or category.
- Filter books by category and current availability.
- Open a book to view its borrower history, including borrower names and loan status.
- Request an available book. A request remains pending until a librarian approves it.
- Reserve an unavailable book and receive a notification when it becomes available.
- View current loans, due dates, overdue loans, and borrowing history.
- Review fines and payment status.
- Update account details and change a password.

## Admin and Librarian Features

- View library activity and inventory statistics on the dashboard.
- Add, edit, and remove books; manage book copies, covers, and categories.
- Review pending borrowing requests and approve or reject each request.
- Issue a book directly to a student when processing an in-person loan.
- Mark issued books as returned and process applicable overdue fines.
- Create student and admin login accounts with an initial password.
- Store and edit student ledger details: admission number, department, and account number.
- Search users, inspect profiles and borrowing histories, and activate or deactivate student accounts.
- Manage fines and library settings.
- Generate and export library reports.

## Borrowing and Ledger Records

- A student request does not reserve a copy or create a loan until it is approved.
- Approval checks that the student is active, has not reached the borrowing limit, and that a copy is available.
- Issued-loan records include the student, book, issue date, due date, return date, and a snapshot of the student's admission number, department, and account number.
- The system records which admin issued or processed a loan or return.
- Returned books become available for circulation, and overdue returns can generate fines.

## System Features

- Role-based access for students and admins.
- Password hashing, JWT authentication, request validation, and rate limiting on authentication routes.
- Per-copy inventory tracking to prevent the same physical copy from being issued twice.
- In-app notifications for borrowing, returns, fines, and reservations.
- PostgreSQL relational storage and versioned SQL migrations.
- CSV exports and print-friendly reports.
