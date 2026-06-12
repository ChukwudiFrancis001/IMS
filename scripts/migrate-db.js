const db = require('../config/db');

async function tableExists(tableName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

async function ensureColumn(tableName, columnName, definition) {
  if (!(await columnExists(tableName, columnName))) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    console.log(`Added ${tableName}.${columnName}`);
  }
}

async function relaxLegacyColumn(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) {
    await db.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${definition}`);
    console.log(`Updated legacy ${tableName}.${columnName}`);
  }
}

async function ensureTable(sql, tableName) {
  if (!(await tableExists(tableName))) {
    await db.query(sql);
    console.log(`Created ${tableName}`);
  }
}

async function main() {
  await ensureTable(`
    CREATE TABLE categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, 'categories');

  await ensureTable(`
    CREATE TABLE users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(120) NOT NULL,
      role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, 'users');

  await ensureColumn('users', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumn('users', 'password_hash', 'VARCHAR(255) NULL');
  await ensureColumn('users', 'last_login', 'DATETIME NULL');
  await ensureColumn('users', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await relaxLegacyColumn('users', 'password', 'VARCHAR(255) NULL');

  await ensureTable(`
    CREATE TABLE products (
      product_id INT AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(50) NOT NULL UNIQUE,
      product_name VARCHAR(150) NOT NULL,
      category_id INT NOT NULL,
      unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'unit',
      minimum_threshold INT NOT NULL DEFAULT 0,
      unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      description TEXT,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, 'products');

  await ensureColumn('products', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumn('products', 'unit_of_measure', "VARCHAR(30) NOT NULL DEFAULT 'unit'");
  await ensureColumn('products', 'minimum_threshold', 'INT NOT NULL DEFAULT 0');
  await ensureColumn('products', 'description', 'TEXT');
  await ensureColumn('products', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('products', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  if (await columnExists('products', 'reorder_threshold')) {
    await db.query('UPDATE products SET minimum_threshold = COALESCE(reorder_threshold, minimum_threshold)');
    console.log('Copied products.reorder_threshold into products.minimum_threshold');
  }

  await ensureTable(`
    CREATE TABLE stock_transactions (
      transaction_id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      transaction_type ENUM('stock_in', 'stock_out') NOT NULL,
      quantity INT NOT NULL,
      unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      reference_number VARCHAR(100),
      notes TEXT,
      user_id INT NOT NULL,
      transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, 'stock_transactions');

  await ensureTable(`
    CREATE TABLE alerts (
      alert_id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      stock_at_trigger INT NOT NULL,
      threshold_at_trigger INT NOT NULL,
      status ENUM('active', 'resolved') NOT NULL DEFAULT 'active',
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL
    )
  `, 'alerts');

  await ensureTable(`
    CREATE TABLE audit_log (
      audit_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      action_type ENUM('INSERT', 'UPDATE', 'DELETE', 'LOGIN') NOT NULL,
      affected_table VARCHAR(80) NOT NULL,
      affected_record_id INT,
      changed_values JSON,
      ip_address VARCHAR(45),
      logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, 'audit_log');

  await db.query(`
    INSERT INTO categories (category_name, description) VALUES
      ('Electronics', 'Devices, accessories, and related stock'),
      ('Office Supplies', 'Consumable office inventory'),
      ('Raw Materials', 'Materials used for production')
    ON DUPLICATE KEY UPDATE description = VALUES(description)
  `);

  console.log('Database migration complete.');
  await db.end();
}

main().catch(async (err) => {
  console.error(err);
  await db.end();
  process.exit(1);
});
