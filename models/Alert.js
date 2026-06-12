const db = require('../config/db');

class Alert {
  static async getActive() {
    const [rows] = await db.query(
      "SELECT a.*, p.product_name, p.sku, p.unit_of_measure FROM alerts a JOIN products p ON a.product_id=p.product_id WHERE a.status='active' ORDER BY (a.stock_at_trigger/NULLIF(a.threshold_at_trigger,0)) ASC"
    );
    return rows;
  }
  static async getAll() {
    const [rows] = await db.query(
      'SELECT a.*, p.product_name, p.sku FROM alerts a JOIN products p ON a.product_id=p.product_id ORDER BY a.triggered_at DESC'
    );
    return rows;
  }
  static async evaluate(product_id) {
    const [[{ current_stock }]] = await db.query(
      "SELECT COALESCE(SUM(CASE WHEN transaction_type='stock_in' THEN quantity ELSE 0 END)-SUM(CASE WHEN transaction_type='stock_out' THEN quantity ELSE 0 END),0) AS current_stock FROM stock_transactions WHERE product_id=?",
      [product_id]
    );
    const [[product]] = await db.query('SELECT minimum_threshold FROM products WHERE product_id=?', [product_id]);
    const threshold = product.minimum_threshold;
    if (current_stock <= threshold) {
      const [[existing]] = await db.query("SELECT alert_id FROM alerts WHERE product_id=? AND status='active' LIMIT 1", [product_id]);
      if (!existing) {
        await db.query('INSERT INTO alerts (product_id, stock_at_trigger, threshold_at_trigger) VALUES (?,?,?)', [product_id, current_stock, threshold]);
      }
    } else {
      await db.query("UPDATE alerts SET status='resolved', resolved_at=NOW() WHERE product_id=? AND status='active'", [product_id]);
    }
  }
}
module.exports = Alert;
