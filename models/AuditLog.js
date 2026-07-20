const supabase = require('../config/db');

class AuditLog {
  static async getAll({ table, from, to } = {}) {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(500);

    if (table) query = query.eq('affected_table', table);
    if (from) query = query.gte('logged_at', from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('logged_at', toDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  static async log({ user_id, action_type, affected_table, affected_record_id, changed_values, ip_address }) {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        user_id,
        action_type,
        affected_table,
        affected_record_id: affected_record_id || null,
        changed_values: changed_values || null,
        ip_address: ip_address || null
      });
    if (error) throw new Error(error.message);
  }
}

module.exports = AuditLog;
