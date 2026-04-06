const router = require('express').Router();
const ctrl = require('../controllers/alertController');

router.get('/', ctrl.getAlerts);
router.get('/critical', ctrl.getCriticalWards);

module.exports = router;