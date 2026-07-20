const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/alertController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
router.get('/', isAuthenticated, isAdmin, ctrl.index);
router.post('/:id/resolve', isAuthenticated, isAdmin, ctrl.resolve);
router.post('/:id/delete', isAuthenticated, isAdmin, ctrl.delete);
module.exports = router;
