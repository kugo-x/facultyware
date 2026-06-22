var express = require("express");
var router = express.Router();
const asetController = require("../../controllers/asetController");
const { apiAuthenticated } = require("../../middlewares/auth");

// =============================================
//  READ — Terbuka untuk umum (tanpa login)
// =============================================

// GET /api/aset            → semua aset (+ ?q= + ?building_id=)
router.get("/", asetController.apiIndex);

// GET /api/aset/:id        → detail 1 aset
router.get("/:id", asetController.apiShow);

// =============================================
//  WRITE — Wajib login (session-based)
//  Response 401 JSON jika belum terautentikasi
// =============================================

// POST   /api/aset          → buat aset ruangan baru
router.post("/", apiAuthenticated, asetController.apiCreate);

// PUT    /api/aset/:id      → update aset ruangan
router.put("/:id", apiAuthenticated, asetController.apiUpdate);

// DELETE /api/aset/:id     → hapus aset ruangan
router.delete("/:id", apiAuthenticated, asetController.apiDelete);

module.exports = router;
