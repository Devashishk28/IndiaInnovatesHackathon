const { getActiveWards } = require('../services/liveDataService');
const axios = require('axios');
const { normalizeUnits } = require('../utils/unitConverter');
const ML_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';

exports.getAllWards = (req, res) => {
    const wards = getActiveWards();
    res.json({ success: true, data: wards, count: wards.length });
};

exports.getWardById = (req, res) => {
    const ward = getActiveWards().find(w => w.id === parseInt(req.params.id));
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, data: ward });
};

exports.getWardTrend = (req, res) => {
    const ward = getActiveWards().find(w => w.id === parseInt(req.params.id));
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, data: { ward_id: ward.id, name: ward.name, trend: ward.trend, forecast: ward.forecast } });
};

exports.classifySource = async (req, res) => {
    try {
        const cleanData = normalizeUnits(req.body);
        cleanData.hour = req.body.hour || new Date().getHours();
        cleanData.month = req.body.month || (new Date().getMonth() + 1);

        const response = await axios.post(`${ML_URL}/ml/classify-source`, cleanData, { timeout: 10000 });
        res.json({ success: true, data: response.data });
    } catch (err) {
        res.json({ success: true, data: { source: 'Mixed', confidence: 50, ward_action: 'Monitor closely.', icon: '🌫️' }, fallback: true });
    }
};

exports.getForecast = async (req, res) => {
    try {
        const cleanData = normalizeUnits(req.body);
        cleanData.aqi_history = req.body.aqi_history;
        cleanData.hour = req.body.hour || new Date().getHours();
        cleanData.month = req.body.month || (new Date().getMonth() + 1);

        const response = await axios.post(`${ML_URL}/ml/predict-aqi`, cleanData, { timeout: 10000 });
        res.json({ success: true, data: response.data });
    } catch (err) {
        const ward = getActiveWards().find(w => w.id === parseInt(req.params.id));
        res.json({ success: true, data: { forecast: ward ? ward.forecast : [200, 205, 210, 208, 215, 220], trend: 'Stable' }, fallback: true });
    }
};