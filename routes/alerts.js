const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/alertController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
router.get('/', isAuthenticated, isAdmin, ctrl.index);
module.exports = router;
