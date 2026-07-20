const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.index = async (req, res) => {
  const [users, pending] = await Promise.all([User.getAll(), User.getPending()]);
  res.render('users/index', { title: 'User Management', users, pending, user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: req.flash('error') });
};

exports.newForm = (req, res) => {
  res.render('users/form', { title: 'Add User', editUser: null, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.create = async (req, res) => {
  const { email, password, full_name, role } = req.body;
  try {
    const id = await User.create({ email, password, full_name, role: role || 'staff' });
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'INSERT', affected_table: 'users', affected_record_id: null, changed_values: { email, full_name, role }, ip_address: req.ip });
    req.flash('success', `User "${email}" created.`);
    res.redirect('/users');
  } catch (err) {
    if (err.message && err.message.includes('already')) req.flash('error', 'Email already registered.');
    else req.flash('error', 'Could not create user.');
    res.redirect('/users/new');
  }
};

exports.editForm = async (req, res) => {
  const editUser = await User.getById(req.params.id);
  if (!editUser) { req.flash('error', 'User not found.'); return res.redirect('/users'); }
  res.render('users/form', { title: 'Edit User', editUser, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.update = async (req, res) => {
  try {
    const { full_name, role, is_active, password } = req.body;
    const id = req.params.id;
    await User.update(id, { full_name, role, is_active: is_active ? true : false, password: password || undefined });
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'UPDATE', affected_table: 'users', affected_record_id: null, changed_values: { full_name, role, is_active }, ip_address: req.ip });
    req.flash('success', 'User updated.');
    res.redirect('/users');
  } catch (err) {
    console.error('User update error:', err.message);
    req.flash('error', 'Could not update user.');
    res.redirect('/users');
  }
};

exports.auditLog = async (req, res) => {
  try {
    const { table, from, to } = req.query;
    const logs = await AuditLog.getAll({ table, from, to });

    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
    const userMap = {};
    await Promise.all(userIds.map(async (id) => {
      const u = await User.getById(id);
      userMap[id] = u?.user_metadata?.full_name || u?.email || 'Unknown';
    }));

    const enrichedLogs = logs.map(l => ({
      ...l,
      full_name: userMap[l.user_id] || 'System'
    }));

    res.render('users/audit', { title: 'Audit Log', logs: enrichedLogs, filters: { table, from, to }, user: { name: req.session.name, role: req.session.role } });
  } catch (err) {
    console.error('Audit log error:', err.message);
    res.render('users/audit', { title: 'Audit Log', logs: [], filters: {}, user: { name: req.session.name, role: req.session.role } });
  }
};

exports.approve = async (req, res) => {
  try {
    await User.approve(req.params.id);
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'UPDATE', affected_table: 'users', affected_record_id: null, changed_values: { action: 'approved', user_id: req.params.id }, ip_address: req.ip });
    req.flash('success', 'User approved.');
  } catch (err) {
    console.error('Approve error:', err.message);
    req.flash('error', 'Could not approve user.');
  }
  res.redirect('/users');
};

exports.reject = async (req, res) => {
  try {
    await User.reject(req.params.id);
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'DELETE', affected_table: 'users', affected_record_id: null, changed_values: { action: 'rejected', user_id: req.params.id }, ip_address: req.ip });
    req.flash('success', 'User rejected and removed.');
  } catch (err) {
    console.error('Reject error:', err.message);
    req.flash('error', 'Could not reject user.');
  }
  res.redirect('/users');
};
