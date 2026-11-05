const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/fines.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.listFines);
router.get("/payments", requireAuth, requireRole("admin"), ctrl.paymentHistory);
router.post("/:id/pay", requireAuth, requireRole("admin"), ctrl.payFine);
router.post("/:id/waive", requireAuth, requireRole("admin"), ctrl.waiveFine);

module.exports = router;
