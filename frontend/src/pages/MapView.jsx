import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { fetchWards, fetchBlindspots } from '../services/api';
import DelhiMap from '../components/Map/DelhiMap';

export default function MapPage() {
  const navigate = useNavigate();
  const [wards, setWards]               = useState([]);
  const [search, setSearch]             = useState('');
  const [showBlindspots, setShowBlindspots] = useState(false);
  const [blindspots, setBlindspots]     = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetchWards().then(w => { setWards(w); setLoading(false); });
  }, []);

  function toggleBlindspots() {
    setShowBlindspots(b => !b);
    if (!blindspots) fetchBlindspots().then(setBlindspots).catch(() => {});
  }

  const filtered = search
    ? wards.filter(w =>
        w.ward_name.toLowerCase().includes(search.toLowerCase()) ||
        w.district?.toLowerCase().includes(search.toLowerCase()))
    : wards;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 280, background: 'var(--bg-elevated)', borderRadius: 9, border: '1px solid var(--border)', padding: '6px 12px' }}>
          <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-1)', flex: 1 }}
            placeholder="Search ward or district…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={toggleBlindspots}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, fontSize: 12,
            border: showBlindspots ? '1px solid rgba(56,189,248,0.4)' : '1px solid var(--border)',
            background: showBlindspots ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: showBlindspots ? 'var(--brand)' : 'var(--text-3)',
            transition: 'all 0.15s',
          }}
        >
          {showBlindspots ? <Eye size={13} /> : <EyeOff size={13} />}
          Blind Spots
        </button>

        <button
          onClick={() => { setLoading(true); fetchWards().then(w => { setWards(w); setLoading(false); }); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>

        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
          {filtered.length}/{wards.length} wards
        </span>
      </div>

      {/* Blindspot coverage bar */}
      {showBlindspots && blindspots && (
        <div style={{ padding: '8px 16px', background: 'rgba(120,80,0,0.12)', borderBottom: '1px solid rgba(251,146,60,0.15)', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>Coverage Analysis</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Real: <b style={{ color: '#f8fafc' }}>{blindspots.real_sensors}</b></span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Interpolated: <b style={{ color: '#f8fafc' }}>{blindspots.interpolated}</b></span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Coverage: <b style={{ color: '#fbbf24' }}>{blindspots.coverage_percent}%</b></span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1 }}>
            Top gap: <b style={{ color: '#f8fafc' }}>{blindspots.top_5_gap_wards?.[0]?.ward_name || '—'}</b>
          </span>
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, padding: 16 }}>
        {!loading && filtered.length > 0 ? (
          <DelhiMap wards={filtered} navigate={navigate} height="100%" />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13, gap: 8 }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading map…
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
