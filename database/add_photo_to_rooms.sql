-- ================================================
--  Tambah kolom photo ke tabel rooms
--  Jalankan di phpMyAdmin atau MySQL CLI
-- ================================================
ALTER TABLE rooms ADD COLUMN photo VARCHAR(255) NULL DEFAULT NULL AFTER is_public;
