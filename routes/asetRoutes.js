var express = require("express");
var router = express.Router();
const asetController = require("../controllers/asetController");
const { isAuthenticated } = require("../middlewares/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =============================================
//  MULTER — Konfigurasi upload foto aset
// =============================================

// Pastikan folder upload ada
const uploadDir = path.join(__dirname, "../public/uploads/aset");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `aset-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

// Filter hanya izinkan gambar
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diizinkan (jpg, png, webp)"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // Maksimal 2MB
});

// Wrapper untuk menangkap error multer dan meneruskan sebagai flash message
const uploadMiddleware = (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        req.session.flash = {
          type: "error",
          message: "Ukuran file terlalu besar. Maksimal 2MB.",
        };
      } else {
        req.session.flash = {
          type: "error",
          message: `Upload error: ${err.message}`,
        };
      }
      return res.redirect("back");
    } else if (err) {
      req.session.flash = { type: "error", message: err.message };
      return res.redirect("back");
    }
    next();
  });
};

// =============================================
//  WEB ROUTES — Export HARUS sebelum /:id
// =============================================
router.get("/export/pdf", isAuthenticated, asetController.exportPdf);
router.get("/export/docx", isAuthenticated, asetController.exportDocx);

// CRUD
router.get("/", isAuthenticated, asetController.index);
router.get("/create", isAuthenticated, asetController.create);
router.post("/store", isAuthenticated, uploadMiddleware, asetController.store);
router.get("/:id/edit", isAuthenticated, asetController.edit);
router.post(
  "/:id/update",
  isAuthenticated,
  uploadMiddleware,
  asetController.update,
);
router.post("/:id/delete", isAuthenticated, asetController.destroy);

module.exports = router;
