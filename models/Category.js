const supabase = require('../config/db');

class Category {
  static async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('category_name');
    if (error) throw new Error(error.message);
    return data;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('category_id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async create({ category_name, description }) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ category_name, description: description || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data.category_id;
  }
}

module.exports = Category;
