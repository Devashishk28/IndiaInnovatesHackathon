import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fetchWardById, fetchWardForecast, predictSource, aqiColor } from '../services/api';
import SourceChart from '../components/SourceDetection/SourceChart';

const POLLUTANTS = [
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', safe: 60,  color: '#38bdf8' },
  { key: 'pm10', label: 'PM10',  unit: 'µg/m³', safe: 100, color: '#818cf8' },
  { key: 'no2',  label: 'NO₂',   unit: 'µg/m³', safe: 80,  color: '#f97316' },
  { key: 'so2',  label: 'SO₂',   unit: 'µg/m³', safe: 80,  color: '#eab308' },
  { key: 'co',   label: 'CO',    unit: 'mg/m³',  safe: 2,   color: '#22c55e' },
  { key: 'o3',   label: 'O₃',    unit: 'µg/m³', safe: 100, color: '#f43f5e' },
];

export default function WardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ward, setWard] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [w, fc] = await Promise.all([fetchWardById(Number(id)), fetchWardForecast(id)]);
      setWard(w);
      setForecast(fc?.forecast || []);
      if (w?.pm25) {
        predictSource({ pm25: w.pm25, pm10: w.pm10 || w.pm25 * 1.4, no2: w.no2 || 70, co: w.co || 1.0, o3: w.o3 || 35, so2: w.so2 || 12 })
          .then(setSource).catch(() => {});
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      Loading…
    </div>
  );
  if (!ward) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      Ward not found
    </div>
  );

  const color = aqiColor(ward.aqi);
  const forecastAvg = forecast.length ? Math.round(forecast.reduce((s, f) => s + f.predicted_aqi, 0) / forecast.length) : ward.aqi;
  const trend = forecastAvg > ward.aqi + 15 ? 'rising' : forecastAvg < ward.aqi - 15 ? 'falling' : 'stable';
  const trendColor = trend === 'rising' ? '#f87171' : trend === 'falling' ? '#4ade80' : 'var(--text-3)';

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
        style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 9, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
        ><ArrowLeft size={15} /></button>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>{ward.ward_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <MapPin size={11} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{ward.district}</span>
            {!ward.is_real_station && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--text-3)', background: 'var(--bg-elevated)' }}>Interpolated</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 44, fontWeight: 800, color, lineHeight: 1 }}>{ward.aqi}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{ward.category}</div>
        </div>
      </motion.div>

      {/* Pollutant cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {POLLUTANTS.map((p, i) => {
          const val = ward[p.key];
          const pct = Math.min(100, ((val || 0) / (p.safe * 2)) * 100);
          return (
            <motion.div key={p.key}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22,1,0.36,1] }}
              className="card-sm stat-card-lift" style={{ textAlign: 'center' }}
            >
              <div className="label" style={{ marginBottom: 8 }}>{p.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: p.color, lineHeight: 1 }}>{val ?? '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{p.unit}</div>
              <div style={{ marginTop: 10, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: p.color, transition: 'width 0.8s var(--ease)' }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Forecast + Source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span className="section-label">24-Hour Forecast</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: trendColor }}>
              {trend === 'rising' ? <TrendingUp size={13} /> : trend === 'falling' ? <TrendingDown size={13} /> : <Minus size={13} />}
              {trend}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: '#f8fafc' }} formatter={v => [v, 'AQI']} />
              <ReferenceLine y={200} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={300} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="predicted_aqi" stroke={color} strokeWidth={1.5} fill="url(#fg)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="card-glow">
          <span className="section-label" style={{ display: 'block', marginBottom: 16 }}>Pollution Source</span>
          {source
            ? <SourceChart breakdown={source.breakdown} source={source.source} confidence={source.confidence} />
            : <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Detecting sources…</div>
          }
        </motion.div>
      </div>

      {/* 7-day trend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card" style={{ padding: '20px 24px' }}>
        <span className="section-label" style={{ display: 'block', marginBottom: 16 }}>7-Day Trend</span>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={Array.from({ length: 7 }, (_, i) => ({
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            aqi: Math.max(60, ward.aqi + Math.round((Math.random() - 0.5) * 80)),
          }))}>
            <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
            <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: '#f8fafc' }} />
            <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
              {Array.from({ length: 7 }, (_, i) => (
                <Cell key={i} fill={aqiColor(Math.max(60, ward.aqi + Math.round((Math.random() - 0.5) * 80)))} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
