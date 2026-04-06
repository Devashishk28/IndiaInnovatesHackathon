const { getActiveWards } = require('../services/liveDataService');

exports.getAlerts = (req, res) => {
    const alerts = getActiveWards()
        .filter(w => w.aqi > 200)
        .sort((a, b) => b.aqi - a.aqi)
        .map(w => ({
            ward_id: w.id,
            ward_name: w.name,
            aqi: w.aqi,
            aqi_category: w.aqi_category,
            source: w.source,
            grap_stage: w.aqi > 450 ? 4 : w.aqi > 400 ? 3 : w.aqi > 300 ? 2 : 1,
            message: `${w.name}: AQI ${Math.round(w.aqi)} — ${w.aqi_category}`
        }));
    res.json({ success: true, data: alerts, count: alerts.length });
};

exports.getCriticalWards = (req, res) => {
    const critical = getActiveWards().filter(w => w.aqi > 300).sort((a, b) => b.aqi - a.aqi);
    res.json({ success: true, data: critical });
};