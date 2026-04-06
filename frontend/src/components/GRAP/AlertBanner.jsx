import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronDown } from 'lucide-react';
import { fetchAlerts } from '../../services/api';

const STAGE = {
  1: { bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)',  text: '#fb923c', dot: '#f97316' },
  2: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#f87171', dot: '#ef4444' },
  3: { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',  text: '#fca5a5', dot: '#dc2626' },
  4: { bg: 'rgba(127,29,29,0.15)',   border: 'rgba(185,28,28,0.3)',   text: '#fecaca', dot: '#991b1b' },
};

export default function AlertBanner() {
  const [alert, setAlert] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('grap_dismissed') === 'true');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { fetchAlerts().then(setAlert).catch(() => {}); }, []);

  if (!alert || alert.stage === 0 || dismissed) return null;

  const s = STAGE[alert.stage] || STAGE[1];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ background: s.bg, borderBottom: `1px solid ${s.border}`, overflow: 'hidden', flexShrink: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'block' }} />
          <AlertTriangle size={13} style={{ color: s.text, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: s.text, flexShrink: 0 }}>{alert.label}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', flex: 1 }}>{alert.message}</span>
          <span style={{ fontSize: 11, color: s.text, flexShrink: 0 }}>
            {alert.affected_count} wards · AQI {alert.avg_aqi}
          </span>
          <button onClick={() => setExpanded(e => !e)} style={{ color: s.text, padding: 3, borderRadius: 4 }}>
            <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>
          <button onClick={() => { setDismissed(true); sessionStorage.setItem('grap_dismissed', 'true'); }} style={{ color: 'var(--text-3)', padding: 3, borderRadius: 4 }}>
            <X size={13} />
          </button>
        </div>
        <AnimatePresence>
          {expanded && alert.actions?.length > 0 && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 20px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {alert.actions.map((a, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>{a}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
