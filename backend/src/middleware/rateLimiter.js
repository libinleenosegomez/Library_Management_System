const rateLimit = require("express-rate-limit");

// Limits brute-force attempts on login / register / password-reset endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

module.exports = { authLimiter };
