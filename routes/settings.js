const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, (req, res) => {
  res.render('settings/index', { title: 'Settings', user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
});

module.exports = router;
