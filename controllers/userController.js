const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.index = async (req, res) => {
  const users = await User.getAll();
  res.render('users/index', { title: 'User Management', users, user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: req.flash('error') });
};

exports.newForm = (req, res) => {
  res.render('users/form', { title: 'Add User', editUser: null, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.create = async (req, res) => {
  const { username, password, full_name, role } = req.body;
  try {
    const id = await User.create({ username, password, full_name, role: role || 'staff' });
    await AuditLog.log({ user_id: req.session.userId, action_type: 'INSERT', affected_table: 'users', affected_record_id: id, changed_values: { username, full_name, role }, ip_address: req.ip });
    req.flash('success', `User "${username}" created.`);
    res.redirect('/users');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') req.flash('error', 'Username already taken.');
    else req.flash('error', 'Could not create user.');
    res.redirect('/users/new');
  }
};

exports.editForm = async (req, res) => {
  const editUser = await User.findById(req.params.id);
  if (!editUser) { req.flash('error', 'User not found.'); return res.redirect('/users'); }
  res.render('users/form', { title: 'Edit User', editUser, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.update = async (req, res) => {
  const { full_name, role, is_active } = req.body;
  const id = req.params.id;
  await User.update(id, { full_name, role, is_active: is_active ? 1 : 0 });
  await AuditLog.log({ user_id: req.session.userId, action_type: 'UPDATE', affected_table: 'users', affected_record_id: id, changed_values: { full_name, role, is_active }, ip_address: req.ip });
  req.flash('success', 'User updated.');
  res.redirect('/users');
};

exports.auditLog = async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const { table, from, to } = req.query;
  const logs = await AuditLog.getAll({ table, from, to });
  res.render('users/audit', { title: 'Audit Log', logs, filters: { table, from, to }, user: { name: req.session.name, role: req.session.role } });
};
