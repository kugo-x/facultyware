-- ============================================================
--  MIGRATION: Tambah kolom role ke tabel users
--  Nilai: 'admin' (akses penuh) atau 'user' (hanya baca)
--  Jalankan di phpMyAdmin atau MySQL CLI
-- ============================================================

ALTER TABLE users
  ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user'
  AFTER password;

-- Set semua user yang sudah ada menjadi admin (supaya tidak terkunci)
UPDATE users SET role = 'admin';

