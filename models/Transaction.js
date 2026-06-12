const db = require('../config/db');

class Transaction {
  static async getRecent(limit = 10) {
    const [rows] = await db.query(
      'SELECT t.*, p.product_name, p.sku, u.full_name AS recorded_by FROM stock_transactions t JOIN products p ON t.product_id=p.product_id JOIN users u ON t.user_id=u.user_id ORDER BY t.transaction_date DESC LIMIT ?',
      [limit]
    );
    return rows;
  }
  static async getAll({ product_id, type, from, to } = {}) {
    let sql = 'SELECT t.*, p.product_name, p.sku, u.full_name AS recorded_by FROM stock_transactions t JOIN products p ON t.product_id=p.product_id JOIN users u ON t.user_id=u.user_id WHERE 1=1';
    const params = [];
    if (product_id) { sql += ' AND t.product_id=?'; params.push(product_id); }
    if (type)       { sql += ' AND t.transaction_type=?'; params.push(type); }
    if (from)       { sql += ' AND DATE(t.transaction_date)>=?'; params.push(from); }
    if (to)         { sql += ' AND DATE(t.transaction_date)<=?'; params.push(to); }
    sql += ' ORDER BY t.transaction_date DESC';
    const [rows] = await db.query(sql, params);
    return rows;
  }
  static async create({ product_id, transaction_type, quantity, unit_cost, reference_number, notes, user_id }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      if (transaction_type === 'stock_out') {
        const [[stock]] = await conn.query(
          "SELECT COALESCE(SUM(CASE WHEN transaction_type='stock_in' THEN quantity ELSE 0 END),0)-COALESCE(SUM(CASE WHEN transaction_type='stock_out' THEN quantity ELSE 0 END),0) AS current_stock FROM stock_transactions WHERE product_id = ? FOR UPDATE",
          [product_id]
        );
        if (Number(stock.current_stock) < Number(quantity)) {
          throw new Error(`Insufficient stock. Available: ${stock.current_stock} units.`);
        }
      }
      const [result] = await conn.query(
        'INSERT INTO stock_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, notes, user_id) VALUES (?,?,?,?,?,?,?)',
        [product_id, transaction_type, quantity, unit_cost || 0, reference_number || null, notes || null, user_id]
      );
      await conn.query(
        "INSERT INTO audit_log (user_id, action_type, affected_table, affected_record_id, changed_values) VALUES (?,'INSERT','stock_transactions',?,?)",
        [user_id, result.insertId, JSON.stringify({ product_id, transaction_type, quantity })]
      );
      await conn.commit();
      return result.insertId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
  static async getTrendData(days = 30) {
    const [rows] = await db.query(
      "SELECT DATE(transaction_date) AS date, transaction_type, SUM(quantity) AS total FROM stock_transactions WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(transaction_date), transaction_type ORDER BY date ASC",
      [days]
    );
    return rows;
  }
  static async getTopProducts(limit = 10) {
    const [rows] = await db.query(
      "SELECT p.product_name, p.sku, COUNT(*) AS txn_count, SUM(t.quantity) AS total_qty FROM stock_transactions t JOIN products p ON t.product_id=p.product_id GROUP BY t.product_id ORDER BY txn_count DESC LIMIT ?",
      [limit]
    );
    return rows;
  }
}
module.exports = Transaction;
