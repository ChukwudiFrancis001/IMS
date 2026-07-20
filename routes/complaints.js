const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/complaintController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/',     isAuthenticated, ctrl.index);
router.get('/new',  isAuthenticated, ctrl.newForm);
router.post('/',    isAuthenticated, ctrl.create);
router.get('/:id',  isAuthenticated, ctrl.detail);
router.post('/:id', isAuthenticated, ctrl.update);
router.post('/:id/delete', isAuthenticated, isAdmin, ctrl.delete);
router.post('/:id/close',  isAuthenticated, isAdmin, ctrl.close);

module.exports = router;
