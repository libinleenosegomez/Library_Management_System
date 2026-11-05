const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl = require("../controllers/books.controller");

const router = express.Router();

router.get("/", requireAuth, ctrl.listBooks);
router.get("/:id", requireAuth, ctrl.getBook);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.single("cover"),
  [
    body("isbn").notEmpty().withMessage("ISBN is required."),
    body("title").notEmpty().withMessage("Title is required."),
    body("author").notEmpty().withMessage("Author is required."),
    body("publisher").notEmpty().withMessage("Publisher is required."),
    body("categoryId").notEmpty().withMessage("Category is required."),
    body("publicationYear").isInt({ min: 1000, max: 3000 }),
    body("totalCopies").isInt({ min: 1 }),
  ],
  validate,
  ctrl.createBook
);

router.put("/:id", requireAuth, requireRole("admin"), upload.single("cover"), ctrl.updateBook);
router.delete("/:id", requireAuth, requireRole("admin"), ctrl.deleteBook);

module.exports = router;
