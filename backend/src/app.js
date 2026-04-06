require('dotenv').config();
const express = require('express');
const cors = require('./middleware/cors');
const { fetchLiveOpenAQ, getActiveWards } = require('./services/liveDataService');

const app = express();
app.use(cors);
app.use(express.json());

// Refresh data from OpenAQ every 15 minutes
setInterval(fetchLiveOpenAQ, 15 * 60 * 1000);

app.use('/api/wards', require('./routes/aqi'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/advisory', require('./routes/advisory'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AQI Backend', port: process.env.PORT }));

app.get('/api/city-summary', (req, res) => {
    const wards = getActiveWards();
    const avg = Math.round(wards.reduce((s, w) => s + w.aqi, 0) / wards.length);
    const worst = wards.reduce((a, b) => a.aqi > b.aqi ? a : b);
    const best  = wards.reduce((a, b) => a.aqi < b.aqi ? a : b);
    const alerts = wards.filter(w => w.aqi > 200).length;
    const clean  = wards.filter(w => w.aqi <= 100).length;
    
    res.json({ 
        success: true, 
        data: { 
            avg_aqi: avg, 
            worst_ward: worst.name, 
            worst_aqi: Math.round(worst.aqi), 
            best_ward: best.name, 
            best_aqi: Math.round(best.aqi), 
            active_alerts: alerts, 
            clean_wards: clean, 
            total_wards: wards.length 
        }
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));