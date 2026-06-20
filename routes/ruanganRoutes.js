var express = require('express');
var router  = express.Router();
const ruanganController = require('../controllers/ruanganController');
const { isAuthenticated }  = require('../middlewares/auth');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// =============================================
//  MULTER — Upload foto ruangan
// =============================================

const uploadDir = path.join(__dirname, '../public/uploads/ruangan');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ruangan-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan (jpg, png, webp)'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

const uploadMiddleware = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      req.session.flash = { type: 'error', message: err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file terlalu besar. Maksimal 2MB.' : `Upload error: ${err.message}` };
      return res.redirect('back');
    } else if (err) {
      req.session.flash = { type: 'error', message: err.message };
      return res.redirect('back');
    }
    next();
  });
};

// =============================================
//  RUANGAN — Export harus sebelum /:id
// =============================================
router.get('/export/pdf',  isAuthenticated, ruanganController.exportPdf);
router.get('/export/docx', isAuthenticated, ruanganController.exportDocx);

// =============================================
//  RUANGAN — CRUD
// =============================================
router.get('/',              isAuthenticated, ruanganController.index);
router.get('/create',        isAuthenticated, ruanganController.create);
router.post('/store',        isAuthenticated, uploadMiddleware, ruanganController.store);
router.get('/:id/edit',      isAuthenticated, ruanganController.edit);
router.post('/:id/update',   isAuthenticated, uploadMiddleware, ruanganController.update);
router.post('/:id/delete',   isAuthenticated, ruanganController.destroy);

// =============================================
//  ASET dalam RUANGAN — harus setelah /:id routes
// =============================================
router.get('/:id/aset',                    isAuthenticated, ruanganController.asetIndex);
router.get('/:id/aset/create',             isAuthenticated, ruanganController.asetCreate);
router.post('/:id/aset/store',             isAuthenticated, ruanganController.asetStore);
router.get('/:id/aset/:asetId/edit',       isAuthenticated, ruanganController.asetEdit);
router.post('/:id/aset/:asetId/update',    isAuthenticated, ruanganController.asetUpdate);
router.post('/:id/aset/:asetId/delete',    isAuthenticated, ruanganController.asetDestroy);

module.exports = router;
