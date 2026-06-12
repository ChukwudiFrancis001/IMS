const bcrypt = require('bcrypt');
const db = require('../config/db');

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';
  const passwordHash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (username, password_hash, full_name, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       role = 'admin',
       is_active = 1`,
    [username, passwordHash, fullName]
  );

  console.log(`Admin user ready: ${username}`);
  await db.end();
}

main().catch(async (err) => {
  console.error(err.message);
  await db.end();
  process.exit(1);
});
