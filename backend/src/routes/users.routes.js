const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/users.controller");

const router = express.Router();

router.get("/", requireAuth, requireRole("admin"), ctrl.listUsers);
router.post(
    "/",
    requireAuth,
    requireRole("admin"), [
        body("name").trim().notEmpty(),
        body("email").isEmail(),
        body("password").isLength({ min: 6 }),
        body("role").optional().isIn(["admin", "student"]),
        body("maxBooks").optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    ctrl.createUser
);
router.get("/:id", requireAuth, requireRole("admin"), ctrl.getUserProfile);
router.put("/:id", requireAuth, requireRole("admin"), ctrl.updateUser);
router.patch(
    "/:id/status",
    requireAuth,
    requireRole("admin"), [body("status").isIn(["active", "inactive"])],
    validate,
    ctrl.setStatus
);
router.post(
    "/me/change-password",
    requireAuth, [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 6 })],
    validate,
    ctrl.changeOwnPassword
);

module.exports = router;