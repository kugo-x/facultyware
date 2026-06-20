var express = require('express');
var router = express.Router();
const gedungController = require('../controllers/gedungController');
const { isAuthenticated } = require('../middlewares/auth');

// =============================================
//  WEB ROUTES — Membutuhkan autentikasi
// =============================================
router.get('/',              isAuthenticated, gedungController.index);
router.get('/create',        isAuthenticated, gedungController.create);
router.post('/store',        isAuthenticated, gedungController.store);
router.get('/:id/edit',      isAuthenticated, gedungController.edit);
router.post('/:id/update',   isAuthenticated, gedungController.update);
router.post('/:id/delete',   isAuthenticated, gedungController.destroy);

// =============================================
//  EXPORT ROUTES — Membutuhkan autentikasi
// =============================================
// PENTING: route /export/* harus SEBELUM /:id/edit agar tidak bentrok
router.get('/export/pdf',    isAuthenticated, gedungController.exportPdf);
router.get('/export/docx',   isAuthenticated, gedungController.exportDocx);

module.exports = router;
