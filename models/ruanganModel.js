const db = require('../lib/db');

// =============================================
//  READ
// =============================================

/**
 * Ambil semua ruangan dengan optional search + filter gedung.
 * Sertakan jumlah aset per ruangan.
 */
const getAll = async (q = '', buildingId = 0) => {
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push(`(r.name LIKE ? OR r.code LIKE ? OR b.name LIKE ?)`);
    const keyword = `%${q}%`;
    params.push(keyword, keyword, keyword);
  }
  if (buildingId && buildingId > 0) {
    conditions.push(`r.building_id = ?`);
    params.push(buildingId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT
       r.id,
       r.name        AS room_name,
       r.code        AS room_code,
       r.floor,
       r.capacity,
       r.is_public,
       r.photo,
       r.building_id,
       b.name        AS building_name,
       b.code        AS building_code,
       COUNT(a.id)   AS jumlah_aset,
       r.created_at,
       r.updated_at
     FROM rooms r
     JOIN buildings b ON r.building_id = b.id
     LEFT JOIN assets a ON a.room_id = r.id
     ${where}
     GROUP BY r.id, r.name, r.code, r.floor, r.capacity, r.is_public, r.photo,
              r.building_id, b.name, b.code, r.created_at, r.updated_at
     ORDER BY b.name ASC, r.name ASC`,
    params
  );
  return rows;
};

/**
 * Ambil 1 ruangan berdasarkan ID.
 */
const getById = async (id) => {
  const [rows] = await db.query(
    `SELECT
       r.id,
       r.name        AS room_name,
       r.code        AS room_code,
       r.floor,
       r.capacity,
       r.is_public,
       r.photo,
       r.building_id,
       b.name        AS building_name,
       b.code        AS building_code,
       r.created_at,
       r.updated_at
     FROM rooms r
     JOIN buildings b ON r.building_id = b.id
     WHERE r.id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Statistik ruangan.
 */
const getStats = async () => {
  const [[{ total_ruangan }]] = await db.query(
    `SELECT COUNT(*) AS total_ruangan FROM rooms`
  );

  const [ruangan_per_gedung] = await db.query(
    `SELECT b.id, b.name, COUNT(r.id) AS jumlah_ruangan
     FROM buildings b
     LEFT JOIN rooms r ON r.building_id = b.id
     GROUP BY b.id, b.name
     ORDER BY b.name ASC`
  );

  return { total_ruangan, ruangan_per_gedung };
};

/**
 * Daftar semua gedung (untuk dropdown).
 */
const getAllBuildings = async () => {
  const [rows] = await db.query(
    `SELECT id, name, code FROM buildings ORDER BY name ASC`
  );
  return rows;
};

/**
 * Cek apakah ruangan masih punya aset.
 */
const hasAssets = async (roomId) => {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM assets WHERE room_id = ?`,
    [roomId]
  );
  return total > 0;
};

// =============================================
//  WRITE
// =============================================

/**
 * Buat ruangan baru.
 */
const create = async (data) => {
  const [result] = await db.query(
    `INSERT INTO rooms
       (building_id, name, code, floor, capacity, is_public, photo,
        responsible_employee_id, employee_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())`,
    [
      data.building_id,
      data.room_name,
      data.room_code,
      data.floor || null,
      data.capacity || 0,
      data.is_public ? 1 : 0,
      data.photo || null,
    ]
  );
  return result.insertId;
};

/**
 * Update ruangan.
 */
const update = async (id, data) => {
  const params = [
    data.building_id,
    data.room_name,
    data.room_code,
    data.floor || null,
    data.capacity || 0,
    data.is_public ? 1 : 0,
  ];

  if (data.photo) params.push(data.photo);
  params.push(id);

  await db.query(
    `UPDATE rooms SET
       building_id = ?, name = ?, code = ?, floor = ?,
       capacity = ?, is_public = ?${data.photo ? ', photo = ?' : ''},
       updated_at = NOW()
     WHERE id = ?`,
    params
  );
};

/**
 * Hapus ruangan (dan semua aset di dalamnya via CASCADE).
 */
const destroy = async (id) => {
  await db.query(`DELETE FROM rooms WHERE id = ?`, [id]);
};

module.exports = {
  getAll,
  getById,
  getStats,
  getAllBuildings,
  hasAssets,
  create,
  update,
  destroy,
};
