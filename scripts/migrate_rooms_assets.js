const db = require('../lib/db');

async function migrate() {
  try {
    // 1. Tambah room_id ke assets jika belum ada
    const [cols] = await db.query("SHOW COLUMNS FROM assets LIKE 'room_id'");
    if (cols.length > 0) {
      console.log('room_id sudah ada di assets, skip');
    } else {
      await db.query('ALTER TABLE assets ADD COLUMN room_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER id');
      console.log('OK: Tambah room_id ke assets');
    }

    // 2. Cek apakah asset_id masih ada di rooms
    const [roomCols] = await db.query("SHOW COLUMNS FROM rooms LIKE 'asset_id'");
    if (roomCols.length > 0) {
      // Migrasi data lama
      const [migResult] = await db.query('UPDATE assets a JOIN rooms r ON r.asset_id = a.id SET a.room_id = r.id WHERE a.room_id IS NULL');
      console.log('OK: Migrasi data lama, affected rows:', migResult.affectedRows);

      // Cari FK constraints di rooms.asset_id
      const [fks] = await db.query(
        "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'asset_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
      );
      for (const fk of fks) {
        await db.query('ALTER TABLE rooms DROP FOREIGN KEY `' + fk.CONSTRAINT_NAME + '`');
        console.log('OK: Drop FK', fk.CONSTRAINT_NAME);
      }

      // Cari index di rooms.asset_id
      const [idxs] = await db.query("SHOW INDEX FROM rooms WHERE Column_name = 'asset_id'");
      for (const idx of idxs) {
        if (idx.Key_name !== 'PRIMARY') {
          await db.query('ALTER TABLE rooms DROP INDEX `' + idx.Key_name + '`');
          console.log('OK: Drop index', idx.Key_name);
        }
      }

      await db.query('ALTER TABLE rooms DROP COLUMN asset_id');
      console.log('OK: Hapus asset_id dari rooms');
    } else {
      console.log('asset_id sudah tidak ada di rooms, skip');
    }

    // 3. Tambah FK fk_assets_room_id jika belum ada
    const [existFk] = await db.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'room_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
    );
    if (existFk.length === 0) {
      await db.query('ALTER TABLE assets ADD CONSTRAINT fk_assets_room_id FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE');
      console.log('OK: Tambah FK fk_assets_room_id');
    } else {
      console.log('FK fk_assets_room_id sudah ada');
    }

    console.log('\n=== MIGRATION SELESAI ===');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

migrate();
