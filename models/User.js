const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/db');

class User {
  static async findByEmail(email) {
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);
    if (error || !data?.user) return null;
    return data.user;
  }

  static async getById(id) {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data?.user) return null;
    return data.user;
  }

  static async getAll() {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    return data.users.map(u => ({
      user_id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || '',
      role: u.user_metadata?.role || 'staff',
      is_active: !u.banned,
      approved: u.user_metadata?.approved !== false,
      last_login: u.last_sign_in_at,
      created_at: u.created_at
    }));
  }

  static async create({ email, password, full_name, role }) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name, role: role || 'staff', approved: true },
      email_confirm: true
    });
    if (error) throw new Error(error.message);
    return data.user.id;
  }

  static async createUnapproved({ email, password, full_name }) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name, role: 'staff', approved: false },
      email_confirm: true
    });
    if (error) throw new Error(error.message);
    return data.user.id;
  }

  static async approve(id) {
    const user = await User.getById(id);
    if (!user) throw new Error('User not found');
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        ...user.user_metadata,
        approved: true
      }
    });
    if (error) throw new Error(error.message);
  }

  static async reject(id) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  }

  static async getPending() {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    return data.users
      .filter(u => u.user_metadata?.approved === false)
      .map(u => ({
        user_id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || '',
        role: u.user_metadata?.role || 'staff',
        created_at: u.created_at
      }));
  }

  static async update(id, { full_name, role, is_active, password }) {
    const updateData = { user_metadata: { full_name, role } };
    if (password) updateData.password = password;
    const { error } = await supabase.auth.admin.updateUserById(id, updateData);
    if (error) throw new Error(error.message);
    if (!is_active) {
      const { error: banError } = await supabase.auth.admin.updateUserById(id, { ban_duration: '100y' });
      if (banError) throw new Error(banError.message);
    } else {
      const { error: unbanError } = await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' });
      if (unbanError) throw new Error(unbanError.message);
    }
  }

  static async signIn(email, password) {
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    delete authClient.rest;
    return data;
  }

  static async getUserFromToken(accessToken) {
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: { user }, error } = await authClient.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  }

  static async resetPasswordForEmail(email, redirectTo) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(error.message);
    return data;
  }

  static async signOut(accessToken) {
    await supabase.auth.admin.signOut(accessToken);
  }

  static getRole(user) {
    return user?.user_metadata?.role || 'staff';
  }

  static getFullName(user) {
    return user?.user_metadata?.full_name || user?.email || '';
  }
}

module.exports = User;
