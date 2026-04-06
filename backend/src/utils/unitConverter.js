exports.normalizeUnits = (rawData) => {
    let cleanData = { ...rawData };
    
    let temp = cleanData.temperature || 25.0;
    if (temp > 200) cleanData.temperature = temp - 273.15;
    else if (temp > 60 && temp < 150) cleanData.temperature = (temp - 32) * (5/9);

    let no2 = cleanData.no2 || 0.0;
    if (no2 > 0 && no2 < 200) cleanData.no2 = no2 * 1.88;

    let so2 = cleanData.so2 || 0.0;
    if (so2 > 0 && so2 < 200) cleanData.so2 = so2 * 2.62;
        
    let o3 = cleanData.o3 || 0.0;
    if (o3 > 0 && o3 < 200) cleanData.o3 = o3 * 1.96;

    let co = cleanData.co || 0.0;
    if (co > 0 && co < 1000) cleanData.co = (co * 1.15) / 1000.0;

    return cleanData;
};