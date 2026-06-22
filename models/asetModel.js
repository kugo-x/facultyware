const db = require("../lib/db");

// =============================================
//  READ
// =============================================

/**
 * Ambil semua aset milik satu ruangan.
 */
const getByRoomId = async (roomId) => {
  const [rows] = await db.query(
    `SELECT
       a.id,
       a.room_id,
       a.name        AS asset_name,
       a.code        AS asset_code,
       a.type,
       a.acquisition_type,
       a.acquisition_date,
       a.acquisition_cost,
       a.asset_grant_id,
       a.condition   AS asset_condition,
       a.status      AS asset_status,
       ag.name       AS grant_name,
       a.created_at,
       a.updated_at
     FROM assets a
     LEFT JOIN asset_grants ag ON a.asset_grant_id = ag.id
     WHERE a.room_id = ?
     ORDER BY a.name ASC`,
    [roomId],
  );
  return rows;
};

/**
 * Ambil 1 aset berdasarkan ID.
 */
const getById = async (id) => {
  const [rows] = await db.query(
    `SELECT
       a.id,
       a.room_id,
       a.name        AS asset_name,
       a.code        AS asset_code,
       a.type,
       a.acquisition_type,
       a.acquisition_date,
       a.acquisition_cost,
       a.asset_grant_id,
       a.condition   AS asset_condition,
       a.status      AS asset_status,
       ag.name       AS grant_name,
       a.created_at,
       a.updated_at
     FROM assets a
     LEFT JOIN asset_grants ag ON a.asset_grant_id = ag.id
     WHERE a.id = ?`,
    [id],
  );
  return rows[0] || null;
};

/**
 * Statistik aset untuk satu ruangan.
 */
const getStatsByRoomId = async (roomId) => {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM assets WHERE room_id = ?`,
    [roomId],
  );

  const [per_kondisi] = await db.query(
    `SELECT \`condition\`, COUNT(*) AS jumlah
     FROM assets WHERE room_id = ?
     GROUP BY \`condition\``,
    [roomId],
  );

  const [per_status] = await db.query(
    `SELECT status, COUNT(*) AS jumlah
     FROM assets WHERE room_id = ?
     GROUP BY status`,
    [roomId],
  );

  return { total, per_kondisi, per_status };
};

/**
 * Daftar semua asset grants (untuk dropdown hibah).
 */
const getAllGrants = async () => {
  const [rows] = await db.query(
    `SELECT id, name, source, grant_date FROM asset_grants ORDER BY name ASC`,
  );
  return rows;
};

/**
 * Ambil semua aset dari semua ruangan (untuk API).
 * Optional: filter ?q= (nama/kode) dan ?building_id=
 */
const getAll = async (q = "", buildingId = 0) => {
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push(`(a.name LIKE ? OR a.code LIKE ? OR r.name LIKE ?)`);
    const keyword = `%${q}%`;
    params.push(keyword, keyword, keyword);
  }
  if (buildingId && buildingId > 0) {
    conditions.push(`r.building_id = ?`);
    params.push(buildingId);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.query(
    `SELECT
       a.id,
       a.room_id,
       a.name           AS asset_name,
       a.code           AS asset_code,
       a.type,
       a.acquisition_type,
       a.acquisition_date,
       a.acquisition_cost,
       a.asset_grant_id,
       a.\`condition\`  AS asset_condition,
       a.status         AS asset_status,
       r.name           AS room_name,
       r.code           AS room_code,
       b.id             AS building_id,
       b.name           AS building_name,
       ag.name          AS grant_name,
       a.created_at,
       a.updated_at
     FROM assets a
     JOIN rooms r ON a.room_id = r.id
     JOIN buildings b ON r.building_id = b.id
     LEFT JOIN asset_grants ag ON a.asset_grant_id = ag.id
     ${where}
     ORDER BY b.name ASC, r.name ASC, a.name ASC`,
    params,
  );
  return rows;
};

// =============================================
//  WRITE
// =============================================

/**
 * Buat aset baru dalam sebuah ruangan.
 */
const create = async (roomId, data) => {
  const [result] = await db.query(
    `INSERT INTO assets
       (room_id, name, code, type, acquisition_type, acquisition_date,
        acquisition_cost, asset_grant_id, \`condition\`, status, created_at, updated_at)
     VALUES (?, ?, ?, 'room', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      roomId,
      data.asset_name.trim(),
      data.asset_code.trim(),
      data.acquisition_type,
      data.acquisition_date,
      data.acquisition_cost || null,
      data.asset_grant_id || null,
      data.condition,
      data.status,
    ],
  );
  return result.insertId;
};

/**
 * Update aset.
 */
const update = async (id, data) => {
  await db.query(
    `UPDATE assets SET
       name = ?, code = ?, acquisition_type = ?, acquisition_date = ?,
       acquisition_cost = ?, asset_grant_id = ?, \`condition\` = ?, status = ?,
       updated_at = NOW()
     WHERE id = ?`,
    [
      data.asset_name.trim(),
      data.asset_code.trim(),
      data.acquisition_type,
      data.acquisition_date,
      data.acquisition_cost || null,
      data.asset_grant_id || null,
      data.condition,
      data.status,
      id,
    ],
  );
};

/**
 * Hapus aset.
 */
const destroy = async (id) => {
  await db.query(`DELETE FROM assets WHERE id = ?`, [id]);
};

module.exports = {
  getAll,
  getByRoomId,
  getById,
  getStatsByRoomId,
  getAllGrants,
  create,
  update,
  destroy,
};
