const db = require('../lib/db');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    const email = 'user@example.com';
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (rows.length > 0) {
      console.log('❌ Test user "user@example.com" sudah ada di database.');
    } else {
      const hashedPassword = await bcrypt.hash('password', 10);
      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')", 
        ['Test User', email, hashedPassword]
      );
      console.log('✅ Berhasil membuat akun dengan role "user" (Hanya Lihat):');
      console.log('   - Email: user@example.com');
      console.log('   - Password: password');
      console.log('   - Role: user');
    }
  } catch (err) {
    console.error('Error membuat user:', err);
  } finally {
    process.exit(0);
  }
}

createTestUser();
