const db = require('../lib/db');

const TABLE = 'buildings';

// =============================================
//  READ
// =============================================

/**
 * Ambil semua gedung, dengan optional search keyword.
 * @param {string} q - Kata kunci pencarian (name atau code)
 */
const getAll = async (q = '') => {
  if (q) {
    const keyword = `%${q}%`;
    const [rows] = await db.query(
      `SELECT * FROM ${TABLE} WHERE name LIKE ? OR code LIKE ? ORDER BY name ASC`,
      [keyword, keyword]
    );
    return rows;
  }
  const [rows] = await db.query(`SELECT * FROM ${TABLE} ORDER BY name ASC`);
  return rows;
};

/**
 * Ambil 1 gedung berdasarkan ID.
 */
const getById = async (id) => {
  const [rows] = await db.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
  return rows[0] || null;
};

/**
 * Hitung total record (untuk paginasi).
 * @param {string} q - Kata kunci pencarian
 */
const getCount = async (q = '') => {
  if (q) {
    const keyword = `%${q}%`;
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total FROM ${TABLE} WHERE name LIKE ? OR code LIKE ?`,
      [keyword, keyword]
    );
    return rows[0].total;
  }
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${TABLE}`);
  return rows[0].total;
};

/**
 * Statistik gedung:
 * - Total gedung
 * - Total ruangan keseluruhan
 * - Jumlah ruangan per gedung
 */
const getStats = async () => {
  const [[{ total_gedung }]] = await db.query(
    `SELECT COUNT(*) AS total_gedung FROM ${TABLE}`
  );

  const [[{ total_ruangan }]] = await db.query(
    `SELECT COUNT(*) AS total_ruangan FROM rooms`
  );

  const [ruangan_per_gedung] = await db.query(
    `SELECT b.id, b.name, b.code, COUNT(r.id) AS jumlah_ruangan
     FROM ${TABLE} b
     LEFT JOIN rooms r ON r.building_id = b.id
     GROUP BY b.id, b.name, b.code
     ORDER BY b.name ASC`
  );

  return { total_gedung, total_ruangan, ruangan_per_gedung };
};

// =============================================
//  WRITE
// =============================================

/**
 * Buat gedung baru.
 * @param {Object} data - { name, code, description }
 */
const create = async (data) => {
  const [result] = await db.query(
    `INSERT INTO ${TABLE} (name, code, description, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [data.name, data.code, data.description || null]
  );
  return result.insertId;
};

/**
 * Update data gedung.
 * @param {number} id
 * @param {Object} data - { name, code, description }
 */
const update = async (id, data) => {
  await db.query(
    `UPDATE ${TABLE} SET name = ?, code = ?, description = ?, updated_at = NOW()
     WHERE id = ?`,
    [data.name, data.code, data.description || null, id]
  );
};

/**
 * Hapus gedung.
 * @param {number} id
 */
const destroy = async (id) => {
  await db.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
};

/**
 * Cek apakah gedung masih memiliki ruangan (rooms).
 * @param {number} id
 * @returns {boolean}
 */
const hasRooms = async (id) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM rooms WHERE building_id = ?`,
    [id]
  );
  return rows[0].cnt > 0;
};

module.exports = {
  getAll,
  getById,
  getCount,
  getStats,
  create,
  update,
  destroy,
  hasRooms,
};
