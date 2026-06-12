CREATE DATABASE IF NOT EXISTS ims_db;
USE ims_db;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  transaction_type ENUM('stock_in', 'stock_out') NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reference_number VARCHAR(100),
  notes TEXT,
  user_id INT NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_transaction_quantity CHECK (quantity > 0),
  CONSTRAINT fk_transactions_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  alert_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  stock_at_trigger INT NOT NULL,
  threshold_at_trigger INT NOT NULL,
  status ENUM('active', 'resolved') NOT NULL DEFAULT 'active',
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_alerts_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type ENUM('INSERT', 'UPDATE', 'DELETE', 'LOGIN') NOT NULL,
  affected_table VARCHAR(80) NOT NULL,
  affected_record_id INT,
  changed_values JSON,
  ip_address VARCHAR(45),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE
);

CREATE OR REPLACE VIEW product_stock_view AS
SELECT
  p.product_id,
  p.sku,
  p.product_name,
  p.category_id,
  c.category_name,
  p.unit_of_measure,
  p.minimum_threshold,
  p.unit_cost,
  p.description,
  p.is_active,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'stock_in' THEN t.quantity ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.transaction_type = 'stock_out' THEN t.quantity ELSE 0 END), 0) AS current_stock
FROM products p
JOIN categories c ON c.category_id = p.category_id
LEFT JOIN stock_transactions t ON t.product_id = p.product_id
GROUP BY
  p.product_id, p.sku, p.product_name, p.category_id, c.category_name,
  p.unit_of_measure, p.minimum_threshold, p.unit_cost, p.description, p.is_active;

INSERT INTO categories (category_name, description) VALUES
  ('Electronics', 'Devices, accessories, and related stock'),
  ('Office Supplies', 'Consumable office inventory'),
  ('Raw Materials', 'Materials used for production')
ON DUPLICATE KEY UPDATE description = VALUES(description);
