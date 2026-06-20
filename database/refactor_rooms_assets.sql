-- ============================================================
--  MIGRATION: Refactor Rooms & Assets (1-to-1 → 1-to-many)
--  Tujuan: 1 ruangan bisa punya banyak aset
--  Database: facultyware
--  Jalankan di phpMyAdmin atau MySQL CLI
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Tambah kolom room_id ke tabel assets
ALTER TABLE assets
  ADD COLUMN room_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER id;

-- Step 2: Migrasi data lama — pindahkan relasi dari rooms.asset_id ke assets.room_id
UPDATE assets a
JOIN rooms r ON r.asset_id = a.id
SET a.room_id = r.id;

-- Step 3: Hapus kolom asset_id dari tabel rooms
--         (Hapus FK dulu jika ada, lalu hapus kolom)
ALTER TABLE rooms DROP COLUMN asset_id;

-- Step 4: Tambah FK constraint baru di assets.room_id (CASCADE DELETE)
ALTER TABLE assets
  ADD CONSTRAINT fk_assets_room_id
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  ROLLBACK (jika perlu dibatalkan)
-- ============================================================
-- SET FOREIGN_KEY_CHECKS = 0;
-- ALTER TABLE assets DROP FOREIGN KEY fk_assets_room_id;
-- ALTER TABLE assets DROP COLUMN room_id;
-- ALTER TABLE rooms ADD COLUMN asset_id BIGINT UNSIGNED NULL DEFAULT NULL;
-- SET FOREIGN_KEY_CHECKS = 1;
