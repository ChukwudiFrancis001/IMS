const db = require('../config/db');
class AuditLog {
  static async getAll({ table, from, to } = {}) {
    let sql = 'SELECT a.*, u.full_name, u.username FROM audit_log a JOIN users u ON a.user_id=u.user_id WHERE 1=1';
    const params = [];
    if (table) { sql += ' AND a.affected_table=?'; params.push(table); }
    if (from)  { sql += ' AND DATE(a.logged_at)>=?'; params.push(from); }
    if (to)    { sql += ' AND DATE(a.logged_at)<=?'; params.push(to); }
    sql += ' ORDER BY a.logged_at DESC LIMIT 500';
    const [rows] = await db.query(sql, params);
    return rows;
  }
  static async log({ user_id, action_type, affected_table, affected_record_id, changed_values, ip_address }) {
    await db.query(
      'INSERT INTO audit_log (user_id, action_type, affected_table, affected_record_id, changed_values, ip_address) VALUES (?,?,?,?,?,?)',
      [user_id, action_type, affected_table, affected_record_id || null, changed_values ? JSON.stringify(changed_values) : null, ip_address || null]
    );
  }
}
module.exports = AuditLog;
