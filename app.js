require('dotenv').config();
const express         = require('express');
const expressSession  = require('express-session');
const flash           = require('connect-flash');
const path            = require('path');
const methodOverride   = require('method-override');

const app = express();
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({
  name: 'ims_session',
  secret: process.env.SESSION_SECRET || 'ims_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.currentUser = null;
  next();
});

app.use('/auth',         require('./routes/auth'));
app.use('/dashboard',    require('./routes/dashboard'));
app.use('/products',     require('./routes/products'));
app.use('/transactions', require('./routes/transactions'));
app.use('/alerts',       require('./routes/alerts'));
app.use('/complaints',   require('./routes/complaints'));
app.use('/reports',      require('./routes/reports'));
app.use('/users',        require('./routes/users'));
app.use('/settings',     require('./routes/settings'));

app.get('/', (req, res) => {
  if (req.session?.accessToken) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

app.use((req, res) => res.status(404).render('404', { title: '404 - Not Found' }));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`IMS running on http://localhost:${PORT}`));
}
module.exports = app;
