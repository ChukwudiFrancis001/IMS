const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.getLogin = (req, res) => {
  res.render('auth/login', { title: 'Login', error: req.flash('error'), success: req.flash('success') });
};

exports.postLogin = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/login');
  }
  try {
    const { session, user } = await User.signIn(username, password);
    if (user.user_metadata?.approved === false) {
      req.flash('error', 'Your account is pending admin approval.');
      return res.redirect('/auth/login');
    }
    req.session.accessToken = session.access_token;
    req.session.refreshToken = session.refresh_token;
    await AuditLog.log({
      user_id: user.id,
      action_type: 'LOGIN',
      affected_table: 'users',
      affected_record_id: null,
      changed_values: { email: user.email },
      ip_address: req.ip
    });
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err.message);
    req.flash('error', 'Invalid email or password.');
    res.redirect('/auth/login');
  }
};

exports.getRegister = (req, res) => {
  res.render('auth/register', { title: 'Register', error: req.flash('error'), success: req.flash('success') });
};

exports.postRegister = async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/auth/register');
  }
  try {
    await User.createUnapproved({ email, password, full_name });
    req.flash('success', 'Account created! Please wait for admin approval before signing in.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Registration error:', err.message);
    if (err.message && err.message.includes('already')) {
      req.flash('error', 'An account with this email already exists.');
    } else {
      req.flash('error', 'Could not create account. Please try again.');
    }
    res.redirect('/auth/register');
  }
};

exports.logout = async (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};

exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password', error: req.flash('error'), success: req.flash('success') });
};

exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  try {
    const redirectTo = `${req.protocol}://${req.get('host')}/auth/reset-password`;
    await User.resetPasswordForEmail(email, redirectTo);
    res.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.json({ success: true });
  }
};

exports.getResetPassword = (req, res) => {
  res.render('auth/reset-password', {
    title: 'Reset Password',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
};
