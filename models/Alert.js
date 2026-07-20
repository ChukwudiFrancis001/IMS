const supabase = require('../config/db');

class Alert {
  static async getActive() {
    const { data, error } = await supabase
      .from('alerts')
      .select('*, products(product_name, sku, unit_of_measure)')
      .eq('status', 'active')
      .order('triggered_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data.map(a => ({
      ...a,
      product_name: a.products?.product_name,
      sku: a.products?.sku,
      unit_of_measure: a.products?.unit_of_measure
    }));
  }

  static async getAll() {
    const { data, error } = await supabase
      .from('alerts')
      .select('*, products(product_name, sku)')
      .order('triggered_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data.map(a => ({
      ...a,
      product_name: a.products?.product_name,
      sku: a.products?.sku
    }));
  }

  static async evaluate(product_id) {
    const { error } = await supabase.rpc('evaluate_alert', { p_product_id: product_id });
    if (error) throw new Error(error.message);
  }

  static async resolve(alert_id) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('alert_id', alert_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async delete(alert_id) {
    const { data: existing, error: fetchErr } = await supabase
      .from('alerts')
      .select('*')
      .eq('alert_id', alert_id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('alert_id', alert_id);
    if (error) throw new Error(error.message);
    return existing;
  }
}

module.exports = Alert;
