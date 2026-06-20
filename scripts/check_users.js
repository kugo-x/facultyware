const db = require('../lib/db');

async function checkUsers() {
  try {
    const [rows] = await db.query('SELECT id, name, email FROM users LIMIT 10');
    console.log('Users di database:');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}
checkUsers();
