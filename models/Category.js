const db = require('../config/db');
class Category {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY category_name');
    return rows;
  }
  static async create({ category_name, description }) {
    const [result] = await db.query('INSERT INTO categories (category_name, description) VALUES (?,?)', [category_name, description || null]);
    return result.insertId;
  }
}
module.exports = Category;
