// Checks user is logged in
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  req.flash('error', 'Please log in to access this page.');
  res.redirect('/auth/login');
};

// Checks user has Admin role
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') return next();
  req.flash('error', 'Access denied. Admin only.');
  res.redirect('/dashboard');
};
