const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/borrowings.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.listBorrowings);
router.get("/requests", requireAuth, ctrl.listRequests);
router.post("/requests", requireAuth, [body("bookId").notEmpty()], validate, ctrl.requestBook);
router.patch("/requests/:id", requireAuth, requireRole("admin"), [body("decision").isIn(["approved", "rejected"])], validate, ctrl.decideRequest);
router.post("/", requireAuth, requireRole("admin"), [body("bookId").notEmpty()], validate, ctrl.borrowBook);
router.post("/:id/return", requireAuth, requireRole("admin"), ctrl.returnBook);

module.exports = router;