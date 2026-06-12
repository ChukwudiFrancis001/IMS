const Alert = require('../models/Alert');
exports.index = async (req, res) => {
  const alerts = await Alert.getAll();
  res.render('alerts/index', { title: 'Alerts', alerts, user: { name: req.session.name, role: req.session.role }, success: req.flash('success') });
};
