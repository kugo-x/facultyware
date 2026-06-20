-- ============================================================
--  FIX: Buat responsible_employee_id dan employee_id nullable
--  Jalankan di phpMyAdmin atau MySQL CLI
--  Database target: facultyware
-- ============================================================

ALTER TABLE rooms
  MODIFY responsible_employee_id BIGINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE rooms
  MODIFY employee_id BIGINT UNSIGNED NULL DEFAULT NULL;
