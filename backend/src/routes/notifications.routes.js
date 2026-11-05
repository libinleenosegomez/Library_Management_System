const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/notifications.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.listNotifications);
router.post("/mark-all-read", requireAuth, ctrl.markAllRead);

module.exports = router;
