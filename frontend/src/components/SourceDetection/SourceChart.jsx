import { motion } from 'framer-motion';

const SOURCE_CONFIG = {
  Vehicular:    { icon: '🚗', color: '#38bdf8', label: 'Vehicular' },
  Biomass:      { icon: '🔥', color: '#f97316', label: 'Biomass / Stubble' },
  Industrial:   { icon: '🏭', color: '#a78bfa', label: 'Industrial' },
  Construction: { icon: '🏗️', color: '#fbbf24', label: 'Construction Dust' },
  Mixed:        { icon: '🌫️', color: '#94a3b8', label: 'Mixed Sources' },
};

export default function SourceChart({ breakdown = {}, source = 'Mixed', confidence = 0.5 }) {
  const entries = Object.entries(breakdown)
    .map(([k, v]) => ({ key: k, pct: typeof v === 'number' ? v : 0, ...(SOURCE_CONFIG[k] || { color: '#64748b', icon: '🌫️', label: k }) }))
    .sort((a, b) => b.pct - a.pct);

  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.Mixed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{cfg.label}</p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{Math.round(confidence * 100)}% confidence</p>
        </div>
      </div>
      {entries.map(({ key, pct, icon, color, label }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
