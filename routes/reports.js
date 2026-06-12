const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
router.get('/stock',     isAuthenticated, ctrl.stock);
router.get('/analytics', isAuthenticated, isAdmin, ctrl.analytics);
module.exports = router;
