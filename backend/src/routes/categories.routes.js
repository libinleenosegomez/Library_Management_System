const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/categories.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.listCategories);
router.post("/", requireAuth, requireRole("admin"), [body("name").notEmpty()], validate, ctrl.createCategory);
router.put("/:id", requireAuth, requireRole("admin"), [body("name").notEmpty()], validate, ctrl.updateCategory);
router.delete("/:id", requireAuth, requireRole("admin"), ctrl.deleteCategory);

module.exports = router;
