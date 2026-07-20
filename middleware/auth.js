const User = require('../models/User');

exports.isAuthenticated = async (req, res, next) => {
  const accessToken = req.session?.accessToken;
  if (!accessToken) {
    req.flash('error', 'Please log in to access this page.');
    return res.redirect('/auth/login');
  }
  try {
    const user = await User.getUserFromToken(accessToken);
    if (!user) {
      req.session = null;
      req.flash('error', 'Session expired. Please log in again.');
      return res.redirect('/auth/login');
    }
    if (user.user_metadata?.approved === false) {
      req.session = null;
      req.flash('error', 'Your account is pending admin approval.');
      return res.redirect('/auth/login');
    }
    req.supabaseUser = user;
    req.session.supabaseUserId = user.id;
    req.session.role = User.getRole(user);
    req.session.name = User.getFullName(user);
    res.locals.currentUser = {
      id: user.id,
      name: User.getFullName(user),
      role: User.getRole(user),
      email: user.email
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    req.session = null;
    req.flash('error', 'Session expired. Please log in again.');
    res.redirect('/auth/login');
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.session?.role === 'admin') return next();
  req.flash('error', 'Access denied. Admin only.');
  res.redirect('/dashboard');
};
