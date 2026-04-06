const router = require('express').Router();
const ctrl = require('../controllers/aqiController');

router.get('/', ctrl.getAllWards);
router.get('/:id', ctrl.getWardById);
router.get('/:id/trend', ctrl.getWardTrend);
router.post('/classify', ctrl.classifySource);
router.post('/:id/forecast', ctrl.getForecast);

module.exports = router;