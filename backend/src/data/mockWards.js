const baseStations = [
  {id:1, name:'Anand Vihar', zone:'East'}, {id:2, name:'ITO', zone:'Central'},
  {id:3, name:'Punjabi Bagh', zone:'West'}, {id:4, name:'Wazirpur', zone:'North-West'},
  {id:5, name:'Rohini', zone:'North-West'}, {id:6, name:'Jahangirpuri', zone:'North'},
  {id:7, name:'Bawana', zone:'Far North'}, {id:8, name:'Alipur', zone:'Far North'},
  {id:9, name:'Narela', zone:'Far North'}, {id:10, name:'DTU', zone:'North-West'},
  {id:11, name:'Mundka', zone:'West'}, {id:12, name:'Dwarka Sec 8', zone:'South-West'},
  {id:13, name:'NSIT Dwarka', zone:'South-West'}, {id:14, name:'Najafgarh', zone:'South-West'},
  {id:15, name:'RK Puram', zone:'South'}, {id:16, name:'Lodhi Road', zone:'Central'},
  {id:17, name:'Sirifort', zone:'South'}, {id:18, name:'Okhla Phase 2', zone:'South-East'},
  {id:19, name:'Patparganj', zone:'East'}, {id:20, name:'Vivek Vihar', zone:'East'},
  {id:21, name:'Ashok Vihar', zone:'North'}, {id:22, name:'Burari Crossing', zone:'North'},
  {id:23, name:'Pusa', zone:'Central'}, {id:24, name:'Mandir Marg', zone:'Central'},
  {id:25, name:'Shadipur', zone:'Central'}, {id:26, name:'North Campus DU', zone:'North'},
  {id:27, name:'Nehru Nagar', zone:'South'}, {id:28, name:'Aya Nagar', zone:'South'},
  {id:29, name:'Sonia Vihar', zone:'North-East'}, {id:30, name:'IHBAS', zone:'East'},
  {id:31, name:'IGI Airport T3', zone:'South-West'}, {id:32, name:'CRRI Mathura Rd', zone:'South'},
  {id:33, name:'Chandni Chowk', zone:'Central'}, {id:34, name:'JN Stadium', zone:'Central'},
  {id:35, name:'Sri Aurobindo Marg', zone:'South'}, {id:36, name:'Mayapuri', zone:'West'},
  {id:37, name:'Dwarka Sec 10', zone:'South-West'}, {id:38, name:'Rohini Sec 16', zone:'North-West'},
  {id:39, name:'Satyawati College', zone:'North'}, {id:40, name:'Loni', zone:'North-East'}
];

const mockWards = baseStations.map(s => {
  const aqi = Math.floor(Math.random() * 200) + 100;
  return {
    ...s,
    lat: 28.6 + (Math.random() * 0.2 - 0.1),
    lng: 77.2 + (Math.random() * 0.2 - 0.1),
    aqi: aqi,
    pm25: aqi * 0.42,
    pm10: aqi * 0.7,
    no2: aqi * 0.18,
    co: aqi * 0.005,
    o3: aqi * 0.12,
    so2: aqi * 0.08,
    temperature: 25.0,
    relativehumidity: 50.0,
    source: 'Vehicular',
    confidence: 75,
    trend: [aqi-10, aqi-5, aqi, aqi+5, aqi+10, aqi+15, aqi],
    forecast: [aqi, aqi+5, aqi+10, aqi+15, aqi+8, aqi-5],
    aqi_category: aqi > 300 ? 'Severe' : aqi > 200 ? 'Poor' : 'Moderate'
  };
});

module.exports = { mockWards, baseStations };