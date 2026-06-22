var express = require("express");
var router = express.Router();
const gedungController = require("../controllers/gedungController");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");

// =============================================
//  READ — Semua user yang login bisa akses
// =============================================
router.get("/", isAuthenticated, gedungController.index);
router.get("/export/pdf", isAuthenticated, gedungController.exportPdf);
router.get("/export/docx", isAuthenticated, gedungController.exportDocx);

// =============================================
//  WRITE — Hanya admin yang boleh
// =============================================
router.get("/create", isAuthenticated, isAdmin, gedungController.create);
router.post("/store", isAuthenticated, isAdmin, gedungController.store);
router.get("/:id/edit", isAuthenticated, isAdmin, gedungController.edit);
router.post("/:id/update", isAuthenticated, isAdmin, gedungController.update);
router.post("/:id/delete", isAuthenticated, isAdmin, gedungController.destroy);

module.exports = router;
