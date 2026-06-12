require('dotenv').config();
const express       = require('express');
const cookieSession = require('cookie-session');
const flash         = require('connect-flash');
const path          = require('path');
const methodOverride = require('method-override');

const app = express();
app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'ims_session',
  keys: [process.env.SESSION_SECRET || 'ims_secret'],
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000
}));
app.use(flash());

// Make session vars available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId ? { id: req.session.userId, name: req.session.name, role: req.session.role } : null;
  next();
});

// Routes
app.use('/auth',         require('./routes/auth'));
app.use('/dashboard',    require('./routes/dashboard'));
app.use('/products',     require('./routes/products'));
app.use('/transactions', require('./routes/transactions'));
app.use('/alerts',       require('./routes/alerts'));
app.use('/reports',      require('./routes/reports'));
app.use('/users',        require('./routes/users'));
app.use('/settings',     require('./routes/settings'));

// Root redirect
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// 404 handler
app.use((req, res) => res.status(404).render('404', { title: '404 - Not Found' }));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`IMS running on http://localhost:${PORT}`));
}
module.exports = app;
