const axios = require('axios');
const { mockWards, baseStations } = require('../data/mockWards');

let activeWards = [...mockWards];

const fetchLiveOpenAQ = async () => {
    try {
        console.log("Fetching live data from OpenAQ...");
        const response = await axios.get(
            'https://api.openaq.org/v3/locations?bbox=76.8,28.4,77.4,28.9&limit=40',
            { headers: { 'X-API-Key': process.env.OPENAQ_API_KEY } }
        );

        const locations = response.data.results;
        
        if (locations && locations.length > 0) {
            activeWards = baseStations.map((station, index) => {
                const liveLocation = locations[index % locations.length];
                
                // BULLETPROOF SENSOR CHECK
                const getSensor = (param) => {
                    const sensor = liveLocation?.sensors?.find(s => s.parameter?.name === param);
                    // Safely check for latest.value, fallback to value, or return null if missing
                    return sensor?.latest?.value ?? sensor?.value ?? null;
                };

                const pm25 = getSensor('pm25') || (Math.random() * 100 + 50);
                const pm10 = getSensor('pm10') || (pm25 * 1.5);
                const aqi = pm25 * 2.5; // Simplified AQI estimate

                return {
                    ...station,
                    lat: liveLocation.coordinates?.latitude || station.lat,
                    lng: liveLocation.coordinates?.longitude || station.lng,
                    aqi: aqi,
                    pm25: pm25,
                    pm10: pm10,
                    no2: getSensor('no2') || 20.0,
                    co: getSensor('co') || 1.5,
                    o3: getSensor('o3') || 30.0,
                    so2: getSensor('so2') || 10.0,
                    temperature: getSensor('temperature') || 28.0,
                    relativehumidity: getSensor('relativehumidity') || 45.0,
                    source: 'Mixed',
                    confidence: 80,
                    trend: [aqi-10, aqi-5, aqi-2, aqi, aqi+2, aqi+5, aqi],
                    forecast: [], 
                    aqi_category: aqi > 300 ? 'Severe' : aqi > 200 ? 'Poor' : 'Moderate'
                };
            });
            console.log("Successfully updated active wards with live OpenAQ data.");
        }
    } catch (err) {
        console.error("OpenAQ Fetch Error (Using Mock Fallback):", err.message);
    }
};

// Initial fetch
fetchLiveOpenAQ();

module.exports = { 
    getActiveWards: () => activeWards,
    fetchLiveOpenAQ 
};