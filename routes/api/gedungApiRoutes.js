var express = require("express");
var router = express.Router();
const gedungController = require("../../controllers/gedungController");
const { apiAuthenticated } = require("../../middlewares/auth");

// =============================================
//  READ — Terbuka untuk umum (tanpa login)
// =============================================

// GET /api/gedung          → semua gedung (+ ?q= search)
router.get("/", gedungController.apiIndex);

// GET /api/gedung/:id      → detail 1 gedung
router.get("/:id", gedungController.apiShow);

// =============================================
//  WRITE — Wajib login (session-based)
//  Response 401 JSON jika belum terautentikasi
// =============================================

// POST   /api/gedung        → buat gedung baru
router.post("/", apiAuthenticated, gedungController.apiCreate);

// PUT    /api/gedung/:id    → update gedung
router.put("/:id", apiAuthenticated, gedungController.apiUpdate);

// DELETE /api/gedung/:id   → hapus gedung
router.delete("/:id", apiAuthenticated, gedungController.apiDelete);

module.exports = router;
