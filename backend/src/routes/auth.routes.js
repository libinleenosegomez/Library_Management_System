const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  validate,
  ctrl.register
);

router.post(
  "/login",
  authLimiter,
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  ctrl.login
);

router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail()],
  validate,
  ctrl.forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  [
    body("email").isEmail(),
    body("code").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  validate,
  ctrl.resetPassword
);

router.get("/me", requireAuth, ctrl.me);

module.exports = router;
