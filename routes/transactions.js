const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/transactionController');
const { isAuthenticated } = require('../middleware/auth');
router.get('/',     isAuthenticated, ctrl.index);
router.get('/new',  isAuthenticated, ctrl.newForm);
router.post('/',    isAuthenticated, ctrl.create);
module.exports = router;
