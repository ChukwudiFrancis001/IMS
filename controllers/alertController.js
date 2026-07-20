const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');

exports.index = async (req, res) => {
  try {
    const alerts = await Alert.getAll();
    res.render('alerts/index', { title: 'Alerts', alerts, user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: req.flash('error') });
  } catch (err) {
    console.error('Alerts error:', err.message);
    res.render('alerts/index', { title: 'Alerts', alerts: [], user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: 'Could not load alerts.' });
  }
};

exports.resolve = async (req, res) => {
  try {
    const alert = await Alert.resolve(req.params.id);
    await AuditLog.log({
      user_id: req.session.supabaseUserId,
      action_type: 'UPDATE',
      affected_table: 'alerts',
      affected_record_id: alert.alert_id,
      changed_values: { status: { from: 'active', to: 'resolved' } },
      ip_address: req.ip
    });
    req.flash('success', 'Alert resolved.');
  } catch (err) {
    console.error('Alert resolve error:', err.message);
    req.flash('error', 'Could not resolve alert.');
  }
  res.redirect('/alerts');
};

exports.delete = async (req, res) => {
  try {
    const alert = await Alert.delete(req.params.id);
    await AuditLog.log({
      user_id: req.session.supabaseUserId,
      action_type: 'DELETE',
      affected_table: 'alerts',
      affected_record_id: alert.alert_id,
      changed_values: { deleted_alert: alert },
      ip_address: req.ip
    });
    req.flash('success', 'Alert deleted.');
  } catch (err) {
    console.error('Alert delete error:', err.message);
    req.flash('error', 'Could not delete alert.');
  }
  res.redirect('/alerts');
};
