// Middleware untuk halaman web — redirect ke login jika belum login
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

// Middleware khusus API — kembalikan JSON 401 jika belum login
function apiAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: "Akses ditolak. Silakan login terlebih dahulu.",
  });
}

// Middleware admin — hanya role 'admin' yang boleh akses
// Role 'user' akan dapat flash error dan redirect ke halaman index
function isAdmin(req, res, next) {
  if (req.session.userId && req.session.role === "admin") {
    return next();
  }
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  // Sudah login tapi bukan admin
  req.session.flash = {
    type: "error",
    message: "Anda tidak memiliki izin untuk melakukan aksi ini.",
  };
  // Redirect ke halaman index yang relevan berdasarkan path,
  // agar tidak bergantung header Referer (yang bisa kosong jika URL diketik langsung)
  const path = req.originalUrl || "";
  if (path.startsWith("/gedung")) return res.redirect("/gedung");
  if (path.startsWith("/ruangan")) return res.redirect("/ruangan");
  return res.redirect("/home");
}

module.exports = {
  isAuthenticated,
  apiAuthenticated,
  isAdmin,
};
