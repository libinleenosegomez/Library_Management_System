const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/reports.controller");

const router = express.Router();

router.get("/dashboard", requireAuth, requireRole("admin"), ctrl.dashboardStats);
router.get("/:type", requireAuth, requireRole("admin"), ctrl.getReport);

module.exports = router;
