import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fetchWards, fetchSummary, fetchWardForecast, predictSource, aqiColor } from '../services/api';

/* ── Helpers ─────────────────────────────────────────────────── */
function aqiLabel(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

const SOURCE_ICON = {
  Vehicular: '🚗', Biomass: '🔥', Industrial: '🏭',
  Construction: '🏗️', Mixed: '🌫️',
};

/* ── AQI Circular Gauge ──────────────────────────────────────── */
function AQIGauge({ aqi, color }) {
  const R = 72, cx = 110, cy = 110;
  const circ = Math.PI * R;
  const filled = Math.min(aqi / 500, 1) * circ;
  const x1 = cx - R, y1 = cy, x2 = cx + R, y2 = cy;
  const arc = `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  const label = aqiLabel(aqi);
  return (
    <svg viewBox="0 0 220 130" style={{ width: 220, height: 130 }}>
      {/* AQI color band legend */}
      {[
        [0, '#22c55e'], [0.1, '#84cc16'], [0.2, '#fbbf24'],
        [0.4, '#f97316'], [0.6, '#ef4444'], [0.8, '#a855f7'],
      ].map(([offset], i, arr) => null)}
      {/* Track */}
      <path d={arc} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" strokeLinecap="round" />
      {/* Progress */}
      <path d={arc} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)' }}
      />
      {/* Needle dot */}
      <circle cx={cx} cy={cy - 4} r="3" fill={color} opacity="0.6" />
      {/* Value */}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="40" fontWeight="900" fill={color}
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {aqi}
      </text>
      {/* Category */}
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fontWeight="700"
        fill="rgba(255,255,255,0.55)" style={{ fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </text>
    </svg>
  );
}

/* ── Pollutant Card ──────────────────────────────────────────── */
function PollutantCard({ name, fullName, value, unit, limit, color, icon, delay }) {
  const pct = Math.min(100, ((value || 0) / (limit * 2)) * 100);
  const lvl = value > limit * 1.5 ? 'Unhealthy' : value > limit ? 'Moderate' : 'Good';
  const lvlColor = lvl === 'Unhealthy' ? '#ef4444' : lvl === 'Moderate' ? '#f97316' : '#22c55e';
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: 'var(--bg-card)', border: `1px solid ${color}22`, borderRadius: 14, padding: '18px 20px', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}44`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}22`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color }}>{icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{fullName}</div>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${lvlColor}18`, color: lvlColor }}>{lvl}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 10 }}>{unit}</div>
      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.3, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>Limit: {limit} {unit}</div>
    </motion.div>
  );
}

/* ── Source Card ─────────────────────────────────────────────── */
function SourceCard({ source }) {
  if (!source) return (
    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
      <div>Detecting sources…</div>
    </div>
  );
  const entries = Object.entries(source.breakdown || {})
    .map(([k, v]) => ({ key: k, pct: Number(v) }))
    .sort((a, b) => b.pct - a.pct);
  const COLORS = { Vehicular: '#38bdf8', Biomass: '#f97316', Industrial: '#a78bfa', Construction: '#fbbf24', Mixed: '#64748b' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{SOURCE_ICON[source.source] || '🌫️'}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>{source.source}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{Math.round((source.confidence || 0) * 100)}% confidence</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.6 }}>
        {source.ward_action || 'Monitor and cross-check with field inspection.'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(({ key, pct }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: 'var(--text-2)' }}>{key}</span>
              <span style={{ fontWeight: 700, color: COLORS[key] || '#64748b' }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: COLORS[key] || '#64748b' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Forecast mini bars ──────────────────────────────────────── */
function ForecastCard({ forecast, currentAqi }) {
  const next6 = forecast.slice(0, 6);
  const peak  = next6.reduce((m, f) => Math.max(m, f.predicted_aqi), currentAqi);
  const peakIn = next6.findIndex(f => f.predicted_aqi === peak) + 1;
  if (!next6.length) return <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Loading…</div>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>ML Predicted AQI</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: aqiColor(next6[0]?.predicted_aqi || currentAqi) }}>
            {next6[0]?.predicted_aqi || currentAqi}
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Peak in {peakIn}h</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: aqiColor(peak) }}>{peak}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>Next 6 Hours</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {next6.map((f, i) => {
          const barPct = Math.min(100, (f.predicted_aqi / 400) * 100);
          const col = aqiColor(f.predicted_aqi);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', width: 28, flexShrink: 0 }}>+{i + 1}h</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${barPct}%` }}
                  transition={{ delay: i * 0.06, duration: 0.6 }}
                  style={{ height: '100%', borderRadius: 3, background: col }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: col, width: 32, textAlign: 'right', flexShrink: 0 }}>{f.predicted_aqi}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Anomaly Card ────────────────────────────────────────────── */
function AnomalyCard({ forecast, currentAqi }) {
  const peak  = forecast.slice(0, 6).reduce((m, f) => Math.max(m, f.predicted_aqi), currentAqi);
  const score = Math.min(100, Math.round(Math.abs(peak - currentAqi) / Math.max(currentAqi, 1) * 100));
  const isAnomaly = score > 40;
  const col   = isAnomaly ? '#ef4444' : '#22c55e';
  return (
    <div>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: `${col}12`, border: `1px solid ${col}30`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${col}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14 }}>{isAnomaly ? '⚠️' : '✅'}</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: col }}>{isAnomaly ? 'Anomaly Detected' : 'Normal'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {isAnomaly ? 'Significant spike predicted in next 6h' : 'Reading is within normal bounds.'}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
          <span>Anomaly Score</span>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>{score} / 100</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: col }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>Spike Detected</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: isAnomaly ? '#ef4444' : '#22c55e' }}>{isAnomaly ? 'Yes' : 'No'}</div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>Spike Magnitude</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{Math.abs(peak - currentAqi)} pts</div>
        </div>
      </div>
    </div>
  );
}

/* ── Ward Table ──────────────────────────────────────────────── */
const SOURCE_COLORS = {
  Vehicular:    { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8'  },
  Biomass:      { bg: 'rgba(249,115,22,0.12)',  text: '#fb923c'  },
  Industrial:   { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa'  },
  Construction: { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24'  },
  Mixed:        { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8'  },
};

function WardTable({ wards }) {
  const navigate = useNavigate();
  const [search, setSearch]         = useState('');
  const [srcFilter, setSrcFilter]   = useState('All');
  const [distFilter, setDistFilter] = useState('All');
  const [sortKey, setSortKey]       = useState('aqi');
  const [sortDir, setSortDir]       = useState(-1);

  const districts = useMemo(() => ['All', ...Array.from(new Set(wards.map(w => w.district).filter(Boolean))).sort()], [wards]);

  const sourceCounts = useMemo(() => {
    const m = {};
    wards.forEach(w => { m[w.source] = (m[w.source] || 0) + 1; });
    return m;
  }, [wards]);

  const avgAqi  = wards.length ? Math.round(wards.reduce((s, w) => s + w.aqi, 0) / wards.length) : 0;
  const best    = wards.reduce((a, b) => (!a || b.aqi < a.aqi) ? b : a, null);
  const worst   = wards.reduce((a, b) => (!a || b.aqi > a.aqi) ? b : a, null);

  const filtered = useMemo(() => {
    let out = [...wards];
    if (search)    out = out.filter(w => w.ward_name?.toLowerCase().includes(search.toLowerCase()) || w.district?.toLowerCase().includes(search.toLowerCase()));
    if (srcFilter  !== 'All') out = out.filter(w => w.source === srcFilter);
    if (distFilter !== 'All') out = out.filter(w => w.district === distFilter);
    out.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
    return out;
  }, [wards, search, srcFilter, distFilter, sortKey, sortDir]);

  function toggleSort(k) {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(-1); }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Ward-wise AQI & Source</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(56,189,248,0.12)', color: 'var(--brand)' }}>ML Predicted</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
            <span>Avg: <b style={{ color: aqiColor(avgAqi) }}>{avgAqi}</b></span>
            {best && <span>Best: <b style={{ color: '#22c55e' }}>{best.ward_name} ({best.aqi})</b></span>}
            {worst && <span>Worst: <b style={{ color: '#ef4444' }}>{worst.ward_name} ({worst.aqi})</b></span>}
          </div>
        </div>
        <input
          className="search-input"
          placeholder="Search ward…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, width: 180 }}
        />
      </div>

      {/* Source chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {['All', ...Object.keys(sourceCounts)].map(s => {
          const sc = SOURCE_COLORS[s] || {};
          const active = srcFilter === s;
          return (
            <button key={s} onClick={() => setSrcFilter(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: active ? (sc.bg || 'rgba(56,189,248,0.15)') : 'rgba(255,255,255,0.04)',
                color: active ? (sc.text || 'var(--brand)') : 'var(--text-3)',
                border: active ? `1px solid ${sc.text || 'var(--brand)'}40` : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}>
              {s !== 'All' && <span>{SOURCE_ICON[s] || '•'}</span>}
              {s}{s !== 'All' && `: ${sourceCounts[s]}`}
            </button>
          );
        })}
      </div>

      {/* District tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {districts.map(d => (
          <button key={d} onClick={() => setDistFilter(d)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11,
              background: distFilter === d ? 'var(--brand-dim)' : 'transparent',
              color: distFilter === d ? 'var(--brand)' : 'var(--text-3)',
              fontWeight: distFilter === d ? 700 : 400,
              border: distFilter === d ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[['#','',40],['ward_name','Ward',220],['district','Zone',150],['aqi','AQI',80],['pm25','PM2.5',100],['source','Source',110],['category','Status',100]].map(([k, l, w]) => (
                <th key={k} onClick={k !== '#' ? () => toggleSort(k) : undefined}
                  style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', cursor: k !== '#' ? 'pointer' : 'default', width: w, whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {l} {k === sortKey ? (sortDir === -1 ? '↓' : '↑') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.slice(0, 100).map((w, i) => {
                const sc = SOURCE_COLORS[w.source] || SOURCE_COLORS.Mixed;
                const col = aqiColor(w.aqi);
                return (
                  <motion.tr key={w.ward_id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i, 20) * 0.01 }}
                    className="data-row"
                    onClick={() => navigate(`/ward/${w.ward_id}`)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-2)' }}>{w.ward_name}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-3)' }}>{w.district}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 8, background: `${col}20`, color: col, fontWeight: 800, fontSize: 13 }}>{w.aqi}</span>
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-2)' }}>{w.pm25} <span style={{ fontSize: 10, color: 'var(--text-3)' }}>µg/m³</span></td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600 }}>
                        {SOURCE_ICON[w.source] || '•'} {w.source}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: `${col}15`, color: col, fontSize: 10, fontWeight: 700 }}>{w.category}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'var(--text-3)' }}>
            Showing 100 of {filtered.length} wards — use search/filter to narrow results
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────── */
export default function Dashboard() {
  const [wards, setWards]       = useState([]);
  const [summary, setSummary]   = useState(null);
  const [forecast, setForecast] = useState([]);
  const [source, setSource]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [chartTab, setChartTab] = useState('24h');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [ws, sum] = await Promise.all([fetchWards(), fetchSummary()]);
      setWards(ws);
      setSummary(sum);

      // Get forecast from best real station (index 0)
      const real = ws.find(w => w.is_real_station) || ws[0];
      if (real) {
        const fc = await fetchWardForecast(real.ward_id);
        setForecast(fc?.forecast || []);
      }

      // City-level source detection using avg pollutants from real stations
      const real_stations = ws.filter(w => w.is_real_station);
      if (real_stations.length) {
        const avg = k => real_stations.reduce((s, w) => s + (w[k] || 0), 0) / real_stations.length;
        predictSource({
          pm25: avg('pm25'), pm10: avg('pm10'), no2: avg('no2'),
          co: avg('co'), o3: avg('o3'), so2: avg('so2'),
        }).then(setSource).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <RefreshCw size={20} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading 272 Delhi wards…</span>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  const avgAqi     = summary?.avg_aqi || 0;
  const color      = aqiColor(avgAqi);
  const realWards  = wards.filter(w => w.is_real_station);
  const avgPm25    = realWards.length ? Math.round(realWards.reduce((s, w) => s + (w.pm25 || 0), 0) / realWards.length) : 0;
  const avgPm10    = realWards.length ? Math.round(realWards.reduce((s, w) => s + (w.pm10 || 0), 0) / realWards.length) : 0;
  const avgNo2     = realWards.length ? Math.round(realWards.reduce((s, w) => s + (w.no2 || 0), 0) / realWards.length) : 0;
  const avgO3      = realWards.length ? Math.round(realWards.reduce((s, w) => s + (w.o3 || 0), 0) / realWards.length) : 0;

  const fcMin      = forecast.length ? Math.min(...forecast.map(f => f.predicted_aqi)) : avgAqi;
  const fcMax      = forecast.length ? Math.max(...forecast.map(f => f.predicted_aqi)) : avgAqi;
  const fcChange   = forecast.length ? forecast[forecast.length - 1].predicted_aqi - avgAqi : 0;

  const trend      = fcChange > 15 ? 'rising' : fcChange < -15 ? 'falling' : 'stable';
  const trendColor = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : 'var(--text-3)';
  const TrendIcon  = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;

  // Weather from first real ward
  const weatherWard = realWards[0];
  const temp        = weatherWard?.temperature ?? 28;
  const humidity    = weatherWard?.humidity ?? 55;
  const wind        = weatherWard?.wind_speed ?? 5;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* ── Top row: City card + Trends ── */}
      <div className="dash-top" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16 }}>

        {/* City AQI Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: `linear-gradient(145deg, ${color}18, var(--bg-card))`, border: `1px solid ${color}30`, borderRadius: 18, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>New Delhi</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Delhi, India</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>LIVE</span>
              </div>
              <button onClick={refresh} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
            <AQIGauge aqi={avgAqi} color={color} />
          </div>

          {/* Worst / Best Ward highlight */}
          {summary?.worst_ward && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f87171', marginBottom: 2 }}>Worst Ward</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary.worst_ward.name}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#ef4444' }}>AQI {summary.worst_ward.aqi}</div>
              </div>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 2 }}>Cleanest Ward</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary.good_count > 0 ? `${summary.good_count} wards` : 'Loading…'}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#22c55e' }}>{summary.good_count} Good</div>
              </div>
            </motion.div>
          )}

          {/* Weather row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>{temp}°C</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Temperature</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{humidity}%</div>
                <div style={{ fontSize: 9, color: 'var(--text-3)' }}>Humidity</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{wind}</div>
                <div style={{ fontSize: 9, color: 'var(--text-3)' }}>km/h Wind</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AQI Trends */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>AQI Trends</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: trendColor }}>
                <TrendIcon size={13} />
                <span>{fcChange > 0 ? '+' : ''}{Math.round(fcChange)} in 6hrs</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Avg: <b style={{ color: '#f8fafc' }}>{avgAqi}</b></span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
            {['24h', '7d'].map(t => (
              <button key={t} onClick={() => setChartTab(t)}
                style={{ padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: chartTab === t ? 'var(--bg-card)' : 'transparent', color: chartTab === t ? '#f8fafc' : 'var(--text-3)', border: chartTab === t ? '1px solid var(--border)' : '1px solid transparent', transition: 'all 0.15s' }}>
                {t === '24h' ? 'Last 24 Hours' : 'Last 7 Days'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontSize: 11 }}>
            <span style={{ color: 'var(--text-3)' }}>Min: <b style={{ color: '#22c55e' }}>{fcMin}</b></span>
            <span style={{ color: 'var(--text-3)' }}>Max: <b style={{ color: '#ef4444' }}>{fcMax}</b></span>
            <span style={{ color: 'var(--text-3)' }}>Current: <b style={{ color }}>{avgAqi}</b></span>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: '#f8fafc' }} formatter={v => [v, 'AQI']} />
              <ReferenceLine y={200} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="predicted_aqi" stroke={color} strokeWidth={2} fill="url(#tg)" dot={{ r: 3, fill: color }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Middle: Source | Forecast | Anomaly ── */}
      <div className="dash-mid rg-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="section-label">Pollution Source</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(56,189,248,0.1)', color: 'var(--brand)' }}>ML Model</span>
          </div>
          <SourceCard source={source} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="section-label">AQI Forecast</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3,
              background: trendColor === '#ef4444' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              color: trendColor }}>
              <TrendIcon size={9} /> {trend.charAt(0).toUpperCase() + trend.slice(1)}
            </span>
          </div>
          <ForecastCard forecast={forecast} currentAqi={avgAqi} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
          className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="section-label">Anomaly Detection</span>
          </div>
          <AnomalyCard forecast={forecast} currentAqi={avgAqi} />
        </motion.div>
      </div>

      {/* ── Pollutant Levels ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Pollutant Levels</h2>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Dominant: <b style={{ color: '#f8fafc' }}>
              {avgPm25 > 60 ? 'PM2.5' : avgPm10 > 100 ? 'PM10' : avgNo2 > 80 ? 'NO₂' : 'PM10'}
            </b>
          </span>
        </div>
        <div className="dash-pollutants rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <PollutantCard name="PM2.5" fullName="Fine Particulate Matter" value={avgPm25} unit="µg/m³" limit={60}  color="#38bdf8" icon="PM" delay={0.22} />
          <PollutantCard name="PM10"  fullName="Particulate Matter"       value={avgPm10} unit="µg/m³" limit={100} color="#818cf8" icon="PM" delay={0.26} />
          <PollutantCard name="O₃"   fullName="Ozone"                    value={avgO3}   unit="ppb"   limit={100} color="#22c55e" icon="O3" delay={0.30} />
          <PollutantCard name="NO₂"  fullName="Nitrogen Dioxide"         value={avgNo2}  unit="ppb"   limit={80}  color="#f97316" icon="NO" delay={0.34} />
        </div>
      </div>

      {/* ── Ward Rankings ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="card" style={{ padding: '20px 24px' }}>
        <WardTable wards={wards} />
      </motion.div>
    </div>
  );
}
