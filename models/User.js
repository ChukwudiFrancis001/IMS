const db = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  static async findByUsername(username) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    return rows[0] || null;
  }
  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    return rows[0] || null;
  }
  static async getAll() {
    const [rows] = await db.query('SELECT user_id, username, full_name, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC');
    return rows;
  }
  static async create({ username, password, full_name, role }) {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)', [username, password_hash, full_name, role]);
    return result.insertId;
  }
  static async update(id, { full_name, role, is_active }) {
    await db.query('UPDATE users SET full_name=?, role=?, is_active=? WHERE user_id=?', [full_name, role, is_active, id]);
  }
  static async updateLastLogin(id) {
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [id]);
  }
  static async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}
module.exports = User;
