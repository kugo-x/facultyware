const db = require('../lib/db');
const bcrypt = require('bcryptjs');

async function init() {
  try {
    // Create users table matching the main Workbench schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL
      )
    `);
    console.log('Users table created or already exists.');

    // Check if admin user exists
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', ['Admin', 'admin@example.com', hashedPassword]);
      console.log('Test user "Admin" created with email "admin@example.com" and password "password".');
    } else {
      console.log('Test user "Admin" already exists.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

init();
