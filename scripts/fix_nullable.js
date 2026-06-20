const db = require('../lib/db');

async function fix() {
  try {
    await db.query('ALTER TABLE rooms MODIFY responsible_employee_id BIGINT UNSIGNED NULL DEFAULT NULL');
    console.log('OK: responsible_employee_id sekarang nullable');

    await db.query('ALTER TABLE rooms MODIFY employee_id BIGINT UNSIGNED NULL DEFAULT NULL');
    console.log('OK: employee_id sekarang nullable');

    console.log('\n=== FIX SELESAI ===');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

fix();
