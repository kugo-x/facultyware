var express = require('express');
var router = express.Router();
const gedungController = require('../../controllers/gedungController');

// GET    /api/gedung         → semua gedung (+ ?q= search)
router.get('/',    gedungController.apiIndex);

// GET    /api/gedung/:id     → 1 gedung
router.get('/:id', gedungController.apiShow);

// POST   /api/gedung         → buat gedung baru
router.post('/',   gedungController.apiCreate);

// PUT    /api/gedung/:id     → update gedung
router.put('/:id', gedungController.apiUpdate);

// DELETE /api/gedung/:id     → hapus gedung
router.delete('/:id', gedungController.apiDelete);

module.exports = router;
