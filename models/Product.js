const supabase = require('../config/db');

class Product {
  static async getAllWithStock() {
    const { data, error } = await supabase
      .from('product_stock_view')
      .select('*')
      .eq('is_active', true)
      .order('product_name');
    if (error) throw new Error(error.message);
    return data.map(p => ({
      ...p,
      stock_status:
        p.current_stock <= p.minimum_threshold ? 'LOW' :
        p.current_stock <= p.minimum_threshold * 1.5 ? 'WARNING' : 'OK'
    }));
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('product_stock_view')
      .select('*')
      .eq('product_id', id)
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      stock_status:
        data.current_stock <= data.minimum_threshold ? 'LOW' :
        data.current_stock <= data.minimum_threshold * 1.5 ? 'WARNING' : 'OK'
    };
  }

  static async create({ sku, product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description }) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        sku,
        product_name,
        category_id,
        unit_of_measure: unit_of_measure || 'unit',
        minimum_threshold: minimum_threshold || 0,
        unit_cost: unit_cost || 0,
        description: description || null
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data.product_id;
  }

  static async update(id, data) {
    const { error } = await supabase
      .from('products')
      .update({
        product_name: data.product_name,
        category_id: data.category_id,
        unit_of_measure: data.unit_of_measure,
        minimum_threshold: data.minimum_threshold || 0,
        unit_cost: data.unit_cost || 0,
        description: data.description || null,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', id);
    if (error) throw new Error(error.message);
  }

  static async deactivate(id) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('product_id', id);
    if (error) throw new Error(error.message);
  }

  static async getCurrentStock(id) {
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('transaction_type, quantity')
      .eq('product_id', id);
    if (error) throw new Error(error.message);
    const stockIn = data.filter(t => t.transaction_type === 'stock_in').reduce((sum, t) => sum + t.quantity, 0);
    const stockOut = data.filter(t => t.transaction_type === 'stock_out').reduce((sum, t) => sum + t.quantity, 0);
    return stockIn - stockOut;
  }
}

module.exports = Product;
