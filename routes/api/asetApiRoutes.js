var express = require('express');
var router = express.Router();
const asetController = require('../../controllers/asetController');

// GET    /api/aset          → semua aset ruangan (+ ?q= + ?building_id=)
router.get('/',    asetController.apiIndex);

// GET    /api/aset/:id      → 1 aset ruangan
router.get('/:id', asetController.apiShow);

// POST   /api/aset          → buat aset ruangan baru
router.post('/',   asetController.apiCreate);

// PUT    /api/aset/:id      → update aset ruangan
router.put('/:id', asetController.apiUpdate);

// DELETE /api/aset/:id      → hapus aset ruangan
router.delete('/:id', asetController.apiDelete);

module.exports = router;
