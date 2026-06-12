const db = require('../config/db');

const STOCK_SELECT = `
  SELECT
    p.product_id, p.sku, p.product_name, p.unit_of_measure,
    p.minimum_threshold, p.unit_cost, p.is_active, p.description,
    p.category_id, c.category_name,
    COALESCE(s.current_stock, 0) AS current_stock,
    CASE
      WHEN COALESCE(s.current_stock, 0) <= p.minimum_threshold THEN 'LOW'
      WHEN COALESCE(s.current_stock, 0) <= p.minimum_threshold * 1.5 THEN 'WARNING'
      ELSE 'OK'
    END AS stock_status
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.category_id
  LEFT JOIN (
    SELECT
      product_id,
      COALESCE(SUM(CASE WHEN transaction_type='stock_in' THEN quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN transaction_type='stock_out' THEN quantity ELSE 0 END), 0) AS current_stock
    FROM stock_transactions
    GROUP BY product_id
  ) s ON p.product_id = s.product_id
`;

class Product {
  static async getAllWithStock() {
    const [rows] = await db.query(STOCK_SELECT + ' WHERE p.is_active = 1 ORDER BY FIELD(stock_status, "LOW", "WARNING", "OK"), p.product_name ASC');
    return rows;
  }
  static async getById(id) {
    const [rows] = await db.query(STOCK_SELECT + ' WHERE p.product_id = ?', [id]);
    return rows[0] || null;
  }
  static async create({ sku, product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description }) {
    const [result] = await db.query(
      'INSERT INTO products (sku, product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description) VALUES (?,?,?,?,?,?,?)',
      [sku, product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description || null]
    );
    return result.insertId;
  }
  static async update(id, data) {
    await db.query(
      'UPDATE products SET product_name=?, category_id=?, unit_of_measure=?, minimum_threshold=?, unit_cost=?, description=? WHERE product_id=?',
      [data.product_name, data.category_id, data.unit_of_measure, data.minimum_threshold, data.unit_cost, data.description || null, id]
    );
  }
  static async deactivate(id) {
    await db.query('UPDATE products SET is_active=0 WHERE product_id=?', [id]);
  }
  static async getCurrentStock(id) {
    const [rows] = await db.query(
      "SELECT COALESCE(SUM(CASE WHEN transaction_type='stock_in' THEN quantity ELSE 0 END)-SUM(CASE WHEN transaction_type='stock_out' THEN quantity ELSE 0 END),0) AS current_stock FROM stock_transactions WHERE product_id = ?",
      [id]
    );
    return rows[0].current_stock;
  }
}
module.exports = Product;
