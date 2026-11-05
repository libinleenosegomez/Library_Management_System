const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/reservations.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.listReservations);
router.post("/", requireAuth, [body("bookId").notEmpty()], validate, ctrl.createReservation);
router.post("/:id/cancel", requireAuth, ctrl.cancelReservation);

module.exports = router;
