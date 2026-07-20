const supabase = require('../config/db');
const User = require('./User');

class Transaction {
  static async getRecent(limit = 10) {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('*, products(product_name, sku)')
      .order('transaction_date', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const userIds = [...new Set(data.map(t => t.user_id))];
    const userMap = {};
    await Promise.all(userIds.map(async (id) => {
      const user = await User.getById(id);
      userMap[id] = user?.user_metadata?.full_name || user?.email || 'Unknown';
    }));

    return data.map(t => ({
      ...t,
      product_name: t.products?.product_name,
      sku: t.products?.sku,
      recorded_by: userMap[t.user_id] || 'Unknown'
    }));
  }

  static async getAll({ product_id, type, from, to } = {}) {
    let query = supabase
      .from('stock_transactions')
      .select('*, products(product_name, sku)')
      .order('transaction_date', { ascending: false });

    if (product_id) query = query.eq('product_id', product_id);
    if (type) query = query.eq('transaction_type', type);
    if (from) query = query.gte('transaction_date', from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('transaction_date', toDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const userIds = [...new Set(data.map(t => t.user_id))];
    const userMap = {};
    await Promise.all(userIds.map(async (id) => {
      const user = await User.getById(id);
      userMap[id] = user?.user_metadata?.full_name || user?.email || 'Unknown';
    }));

    return data.map(t => ({
      ...t,
      product_name: t.products?.product_name,
      sku: t.products?.sku,
      recorded_by: userMap[t.user_id] || 'Unknown'
    }));
  }

  static async create({ product_id, transaction_type, quantity, unit_cost, reference_number, notes, user_id }) {
    const { data, error } = await supabase.rpc('create_stock_transaction', {
      p_product_id: product_id,
      p_type: transaction_type,
      p_qty: quantity,
      p_cost: unit_cost || 0,
      p_ref: reference_number || null,
      p_notes: notes || null,
      p_user_id: user_id
    });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getTrendData(days = 30) {
    const { data, error } = await supabase.rpc('get_trend_data', { p_days: days });
    if (error) throw new Error(error.message);
    return data.map(r => ({
      date: new Date(r.txn_date),
      transaction_type: r.transaction_type,
      total: Number(r.total)
    }));
  }

  static async getTopProducts(limit = 10) {
    const { data, error } = await supabase.rpc('get_top_products', { p_limit: limit });
    if (error) throw new Error(error.message);
    return data.map(r => ({
      product_name: r.product_name,
      sku: r.sku,
      txn_count: Number(r.txn_count),
      total_qty: Number(r.total_qty)
    }));
  }
}

module.exports = Transaction;
