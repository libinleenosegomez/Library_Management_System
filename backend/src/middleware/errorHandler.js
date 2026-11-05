// Centralized error handler. Never leaks stack traces or internals in production.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === "23505") { // unique_violation
    return res.status(409).json({ error: "That value must be unique — it already exists." });
  }
  if (err.code === "23503") { // foreign_key_violation
    return res.status(409).json({ error: "This action conflicts with related records." });
  }

  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === "production"
    ? "Something went wrong. Please try again."
    : err.message || "Something went wrong.";

  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: "Route not found." });
}

module.exports = { errorHandler, notFound };
