const supabase = require('../config/db');
const User = require('./User');

class Complaint {
  static async getAll({ status, priority, product_id, user_id } = {}) {
    let query = supabase
      .from('complaints')
      .select('*, products(product_name, sku)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (product_id) query = query.eq('product_id', product_id);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;
    if (error) {
      if (error.message && error.message.includes('does not exist')) return [];
      throw new Error(error.message);
    }

    const userIds = [...new Set(data.map(c => c.user_id))];
    const userMap = {};
    await Promise.all(userIds.map(async (id) => {
      const user = await User.getById(id);
      userMap[id] = user?.user_metadata?.full_name || user?.email || 'Unknown';
    }));

    return data.map(c => ({
      ...c,
      product_name: c.products?.product_name,
      sku: c.products?.sku,
      logged_by: userMap[c.user_id] || 'Unknown'
    }));
  }

  static async getById(complaint_id) {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, products(product_name, sku, category_id, categories(category_name))')
      .eq('complaint_id', complaint_id)
      .single();
    if (error) throw new Error(error.message);

    const user = await User.getById(data.user_id);
    data.logged_by = user?.user_metadata?.full_name || user?.email || 'Unknown';
    data.product_name = data.products?.product_name;
    data.sku = data.products?.sku;
    data.category_name = data.products?.categories?.category_name;

    return data;
  }

  static async create({ product_id, user_id, complaint_type, description, priority }) {
    const { data, error } = await supabase
      .from('complaints')
      .insert({
        product_id,
        user_id,
        complaint_type,
        description,
        priority: priority || 'medium',
        status: 'pending'
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(complaint_id, updates) {
    updates.updated_at = new Date().toISOString();

    const { data: existing } = await supabase
      .from('complaints')
      .select('*')
      .eq('complaint_id', complaint_id)
      .single();

    const { data, error } = await supabase
      .from('complaints')
      .update(updates)
      .eq('complaint_id', complaint_id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const changed = {};
    for (const key of Object.keys(updates)) {
      if (key === 'updated_at') continue;
      if (existing[key] !== data[key]) {
        changed[key] = { from: existing[key], to: data[key] };
      }
    }

    return { data, changed, existing };
  }

  static async updateStatus(complaint_id, status, handling_remarks) {
    const updates = { status };
    if (handling_remarks !== undefined) updates.handling_remarks = handling_remarks;
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    return this.update(complaint_id, updates);
  }

  static async delete(complaint_id) {
    const { data: existing, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('complaint_id', complaint_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('complaint_id', complaint_id);
    if (error) throw new Error(error.message);

    return existing;
  }

  static async getStats() {
    try {
      const { count: pending } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: inProgress } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { count: resolved } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      return {
        pending: pending || 0,
        in_progress: inProgress || 0,
        resolved: resolved || 0
      };
    } catch (err) {
      return { pending: 0, in_progress: 0, resolved: 0 };
    }
  }
}

module.exports = Complaint;
