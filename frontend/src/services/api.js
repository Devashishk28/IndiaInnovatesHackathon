import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aqi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Mock data fallback ─────────────────────────────────────────────
const MOCK_STATION_NAMES = [
  'Anand Vihar','Rohini','Punjabi Bagh','RK Puram','Dwarka',
  'ITO','Lodhi Road','Okhla','Wazirpur','Bawana',
  'Narela','Vivek Vihar','Patparganj','Shahdara','Jahangirpuri',
  'DTU','IGI Airport','Mundka','Nehru Nagar','Sonia Vihar',
];

const AQI_COORDS = {
  'Anand Vihar':   [28.6469, 77.3152],
  'Rohini':        [28.7450, 77.0540],
  'Punjabi Bagh':  [28.6700, 77.1300],
  'RK Puram':      [28.5700, 77.1900],
  'Dwarka':        [28.5921, 77.0460],
  'ITO':           [28.6289, 77.2465],
  'Lodhi Road':    [28.5934, 77.2196],
  'Okhla':         [28.5355, 77.2700],
  'Wazirpur':      [28.7000, 77.1700],
  'Bawana':        [28.7900, 77.0300],
};

// Realistic annual-average AQI per station (scaled by current month in buildMockWards)
const BASE_MOCK_AQI = {
  'Anand Vihar': 165, 'Rohini': 138, 'Punjabi Bagh': 122,
  'RK Puram': 108, 'Dwarka': 115, 'ITO': 132,
  'Lodhi Road': 100, 'Okhla': 125, 'Wazirpur': 145,
  'Bawana': 158, 'Narela': 152, 'Vivek Vihar': 140,
  'Patparganj': 130, 'Shahdara': 142, 'Jahangirpuri': 148,
  'DTU': 120, 'IGI Airport': 98, 'Mundka': 152,
  'Nehru Nagar': 112, 'Sonia Vihar': 128,
};

function _seasonalMultiplier() {
  const m = new Date().getMonth() + 1; // 1-12
  const map = { 1:1.55, 2:1.30, 3:0.88, 4:0.78, 5:0.72, 6:0.70,
                7:0.48, 8:0.45, 9:0.62, 10:1.12, 11:1.58, 12:1.65 };
  return map[m] || 1.0;
}

function aqiCategory(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function aqiColor(aqi) {
  if (aqi <= 50)  return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 200) return '#ff7e00';
  if (aqi <= 300) return '#ff0000';
  if (aqi <= 400) return '#8f3f97';
  return '#7e0023';
}

function buildMockWards() {
  const wards = [];
  // 20 real stations
  let id = 1;
  const sm = _seasonalMultiplier();
  for (const name of MOCK_STATION_NAMES) {
    const base = BASE_MOCK_AQI[name] || 130;
    const aqi  = Math.max(55, Math.round(base * sm * (0.93 + Math.random() * 0.14)));
    const coords = AQI_COORDS[name] || [28.6139 + Math.random()*0.2-0.1, 77.2090 + Math.random()*0.2-0.1];
    wards.push({
      ward_id: id++, ward_name: name,
      lat: coords[0], lng: coords[1],
      district: 'Delhi', is_real_station: true,
      aqi, category: aqiCategory(aqi), color: aqiColor(aqi),
      pm25: Math.round(aqi*0.40), pm10: Math.round(aqi*0.58),
      no2: Math.round(45+aqi*0.18), source: 'Vehicular', confidence: 0.68,
    });
  }
  // Fill to 272 with IDW-estimated wards
  const districts = ['Central Delhi','North Delhi','South Delhi','East Delhi','West Delhi',
                     'North West Delhi','South West Delhi','South East Delhi','North East Delhi','Shahdara'];
  const latRange = [28.46, 28.87];
  const lngRange = [76.96, 77.35];
  while (id <= 272) {
    const aqi = Math.max(60, Math.round((95 + Math.random()*90) * sm));
    const lat  = latRange[0] + Math.random()*(latRange[1]-latRange[0]);
    const lng  = lngRange[0] + Math.random()*(lngRange[1]-lngRange[0]);
    wards.push({
      ward_id: id, ward_name: `Ward ${id}`,
      lat, lng,
      district: districts[id % districts.length],
      is_real_station: false, is_estimated: true,
      confidence: Math.round((0.45 + Math.random()*0.4)*100)/100,
      aqi, category: aqiCategory(aqi), color: aqiColor(aqi),
      pm25: Math.round(aqi*0.38), pm10: Math.round(aqi*0.55),
      no2: Math.round(50+aqi*0.15), source: 'Mixed', confidence2: 0.55,
    });
    id++;
  }
  return wards;
}

let _mockWards = null;
function getMockWards() {
  if (!_mockWards) _mockWards = buildMockWards();
  return _mockWards;
}

// ── API methods ────────────────────────────────────────────────────

export async function fetchWards() {
  try {
    const res = await api.get('/api/wards');
    return res.data.wards || res.data;
  } catch {
    return getMockWards();
  }
}

export async function fetchWardById(id) {
  try {
    const res = await api.get(`/api/wards/${id}`);
    return res.data;
  } catch {
    return getMockWards().find(w => w.ward_id === Number(id)) || null;
  }
}

export async function fetchWardForecast(id) {
  try {
    const res = await api.get(`/api/wards/${id}/forecast`);
    return res.data;
  } catch {
    // Synthetic 24h forecast
    const now = new Date();
    return {
      forecast: Array.from({length:24}, (_, h) => {
        const aqi = Math.max(80, 200 + Math.round(Math.sin(h/3)*50 + Math.random()*30));
        return { hour: `${String((now.getHours()+h+1)%24).padStart(2,'0')}:00`,
                 predicted_aqi: aqi, lower_bound: aqi-30, upper_bound: aqi+30,
                 category: aqiCategory(aqi) };
      })
    };
  }
}

export async function fetchSummary() {
  try {
    const res = await api.get('/api/summary');
    return res.data;
  } catch {
    const wards = getMockWards();
    const avg = Math.round(wards.reduce((s,w)=>s+w.aqi,0)/wards.length);
    const worst = wards.reduce((a,b)=>a.aqi>b.aqi?a:b);
    return {
      avg_aqi: avg,
      worst_ward: { name: worst.ward_name, aqi: worst.aqi },
      severe_count: wards.filter(w=>w.aqi>300).length,
      good_count:   wards.filter(w=>w.aqi<=100).length,
      grap_stage:   avg>400?{stage:3,label:'Stage III',color:'darkred'}
                    :avg>300?{stage:2,label:'Stage II',color:'red'}
                    :avg>200?{stage:1,label:'Stage I',color:'orange'}
                    :{stage:0,label:'No GRAP',color:'green'},
    };
  }
}

export async function fetchAlerts() {
  try {
    const res = await api.get('/api/alerts');
    return res.data;
  } catch {
    const avg = 285;
    return {
      stage: 2, label: 'GRAP Stage II — Very Poor', color: '#ef4444', bg: 'red',
      avg_aqi: avg,
      message: 'Air quality is Very Poor. Sensitive groups should avoid outdoor activities.',
      actions: ['Close brick kilns','Ban diesel generators','Enhanced public transport'],
      affected_count: 47,
    };
  }
}

export async function predictSource(data) {
  try {
    const res = await api.post('/api/predict/source', data);
    return res.data;
  } catch {
    return {
      source: 'Vehicular', icon: '🚗', confidence: 0.68,
      breakdown: { Vehicular: 68, Mixed: 18, Biomass: 8, Industrial: 4, Construction: 2 },
    };
  }
}

export async function predictAqi(data) {
  try {
    const res = await api.post('/api/predict/aqi', data);
    return res.data;
  } catch {
    return await fetchWardForecast(data.ward_id);
  }
}

export async function login(email, password) {
  const res = await api.post('/api/auth/login', { email, password });
  return res.data;
}

export async function logout() {
  try { await api.post('/api/auth/logout'); } catch {}
}

export async function fetchAdminWards() {
  const res = await api.get('/api/admin/wards');
  return res.data;
}

export async function fetchAdminLogs() {
  const res = await api.get('/api/admin/logs');
  return res.data;
}

export async function generatePolicy() {
  const res = await api.post('/api/admin/policy');
  return res.data;
}

export async function submitReport(data) {
  const res = await api.post('/api/reports', data);
  return res.data;
}

export async function fetchReports() {
  try {
    const res = await api.get('/api/reports');
    return res.data;
  } catch {
    return { reports: [] };
  }
}

export async function fetchBlindspots() {
  try {
    const res = await api.get('/api/blindspots');
    return res.data;
  } catch {
    return {
      total_wards: 272, real_sensors: 20, interpolated: 252,
      coverage_percent: 14.7, critical_gaps: 38, moderate_gaps: 92,
      top_5_gap_wards: [], district_coverage: [], recommended_sensors: [],
    };
  }
}

function _localSeverityToAqi(severity, visual) {
  const base = { 1: 80, 2: 130, 3: 180, 4: 260, 5: 350 }[severity] || 130;
  if (['Heavy Smoke', 'Industrial Fumes'].includes(visual)) return Math.round(base * 1.15);
  if (visual === 'Clear') return Math.min(base, 80);
  return base;
}

export async function submitCrowdsource(obs) {
  const aqi_est = _localSeverityToAqi(obs.severity, obs.visual);
  const entry = { id: Date.now().toString(36), ...obs, aqi_est, created_at: new Date().toISOString() };
  // Always save locally first
  const local = JSON.parse(localStorage.getItem('crowd_local') || '[]');
  local.push(entry);
  localStorage.setItem('crowd_local', JSON.stringify(local.slice(-30)));
  try {
    const res = await api.post('/api/crowdsource', obs);
    return res.data;
  } catch {
    // Backend unavailable — local save is good enough
    return { success: true, id: entry.id, aqi_est, local: true };
  }
}

export async function fetchCrowdsource() {
  const cutoff = Date.now() - 6 * 3600 * 1000;
  const local = JSON.parse(localStorage.getItem('crowd_local') || '[]')
    .filter(r => new Date(r.created_at).getTime() > cutoff);
  try {
    const res = await api.get('/api/crowdsource');
    const remote = res.data.readings || [];
    const ids = new Set(remote.map(r => r.id));
    const merged = [...remote, ...local.filter(r => !ids.has(r.id))];
    return { readings: merged, count: merged.length };
  } catch {
    // Backend down — show demo + local entries
    const now = new Date();
    const demo = [
      { id: 'd1', lat: 28.6469, lng: 77.3152, visual: 'Vehicle Exhaust', severity: 3, aqi_est: 160, note: 'Traffic jam near flyover', reporter: 'Rahul K', created_at: new Date(now - 25*60000).toISOString() },
      { id: 'd2', lat: 28.7000, lng: 77.1700, visual: 'Industrial Fumes', severity: 4, aqi_est: 255, note: 'Factory smoke near Wazirpur', reporter: 'Priya S', created_at: new Date(now - 55*60000).toISOString() },
      { id: 'd3', lat: 28.6289, lng: 77.2465, visual: 'Dust Haze', severity: 2, aqi_est: 130, note: 'Construction dust on Ring Road', reporter: 'Amit T', created_at: new Date(now - 70*60000).toISOString() },
    ];
    const ids = new Set(demo.map(r => r.id));
    const merged = [...demo, ...local.filter(r => !ids.has(r.id))];
    return { readings: merged, count: merged.length };
  }
}

export { aqiColor, aqiCategory };
export default api;
