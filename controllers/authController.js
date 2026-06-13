const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.getLogin = (req, res) => {
  res.render('auth/login', { title: 'Login', error: req.flash('error'), success: req.flash('success') });
};

exports.postLogin = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    req.flash('error', 'Username and password are required.');
    return res.redirect('/auth/login');
  }
  try {
    const user = await User.findByUsername(username);
    if (!user) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/auth/login');
    }
    const match = await User.verifyPassword(password, user.password_hash);
    if (!match) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/auth/login');
    }
    req.session.userId = user.user_id;
    req.session.role   = user.role;
    req.session.name   = user.full_name;
    await User.updateLastLogin(user.user_id);
    await AuditLog.log({
      user_id: user.user_id,
      action_type: 'LOGIN',
      affected_table: 'users',
      affected_record_id: user.user_id,
      changed_values: { username: user.username },
      ip_address: req.ip
    });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'A server error occurred. Please try again.');
    res.redirect('/auth/login');
  }
};

exports.logout = (req, res) => {
  req.session = null;
  res.redirect('/auth/login');
};
