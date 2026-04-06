const router = require('express').Router();

router.get('/:aqi', (req, res) => {
    const aqi = parseFloat(req.params.aqi);
    let category, advice, sensitive_advice, color;

    if (aqi <= 50) { category = 'Good'; color = '#55A84F'; advice = 'Air quality satisfactory. No precautions needed.'; sensitive_advice = 'No precautions needed.'; }
    else if (aqi <= 100) { category = 'Satisfactory'; color = '#A3C853'; advice = 'Minor discomfort to sensitive people.'; sensitive_advice = 'Reduce prolonged outdoor exertion.'; }
    else if (aqi <= 200) { category = 'Moderate'; color = '#FFF833'; advice = 'Heart/lung patients, elderly, children should reduce outdoor exertion.'; sensitive_advice = 'Avoid outdoor activity.'; }
    else if (aqi <= 300) { category = 'Poor'; color = '#F29C33'; advice = 'Everyone may experience effects. Sensitive groups avoid outdoor activity.'; sensitive_advice = 'Stay indoors. Wear N95 mask.'; }
    else if (aqi <= 400) { category = 'Very Poor'; color = '#E93F33'; advice = 'Avoid outdoor activity. Wear N95 mask. Close windows during peak hours.'; sensitive_advice = 'Do not go outdoors.'; }
    else { category = 'Severe'; color = '#AF2D24'; advice = 'Stay indoors. N95 mandatory outdoors. Use air purifiers. Call 104 if breathing difficulty.'; sensitive_advice = 'Emergency — stay inside, call doctor.'; }

    res.json({ success: true, data: { aqi, category, color, advice, sensitive_advice } });
});

module.exports = router;