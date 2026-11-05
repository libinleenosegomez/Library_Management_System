const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/settings.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.getSettings);
router.put("/", requireAuth, requireRole("admin"), ctrl.updateSettings);

module.exports = router;
