import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wind, Sun, Moon, Menu, X as XIcon } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import Dashboard      from './pages/Dashboard';
import MapPage        from './pages/MapView';
import WardDetail     from './pages/WardDetail';
import HealthAdvisory from './pages/HealthAdvisory';
import AdminPanel     from './pages/AdminPanel';
import CrowdSource    from './pages/CrowdSource';
import AlertBanner    from './components/GRAP/AlertBanner';
import HealthModal    from './components/Health/HealthModal';

const NAV = [
  { to: '/',           label: 'Dashboard'  },
  { to: '/map',        label: 'Live Map'   },
  { to: '/health',     label: 'Health Tips'},
  { to: '/alerts',     label: 'Alerts'     },
  { to: '/crowd',      label: 'Community'  },
  { to: '/blindspots', label: 'Blind Spots'},
  { to: '/admin',      label: 'Admin'      },
];

function aqiColor(aqi) {
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#84cc16';
  if (aqi <= 200) return '#f97316';
  if (aqi <= 300) return '#ef4444';
  if (aqi <= 400) return '#a855f7';
  return '#7f1d1d';
}
function aqiLabel(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Satisf.';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

/* ── Search Overlay ─────────────────────────── */
function SearchOverlay({ wards, onClose }) {
  const [q, setQ] = useState('');
  const navigate  = useNavigate();
  const ref       = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const results = q.trim()
    ? wards.filter(w =>
        w.ward_name?.toLowerCase().includes(q.toLowerCase()) ||
        w.district?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : [];

  function go(ward) { navigate(`/ward/${ward.ward_id}`); onClose(); }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, paddingInline: 16, background: 'rgba(8,14,28,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 480, background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <input
            ref={ref} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search wards or districts…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#f8fafc' }}
          />
          <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)', fontFamily: 'monospace' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {results.length > 0 ? results.map((w, i) => (
            <motion.button key={w.ward_id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => go(w)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'transparent', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${aqiColor(w.aqi)}18`, color: aqiColor(w.aqi), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                {w.aqi}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>{w.ward_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{w.district}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${aqiColor(w.aqi)}18`, color: aqiColor(w.aqi) }}>
                {aqiLabel(w.aqi)}
              </span>
            </motion.button>
          )) : (
            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              {q.trim() ? `No results for "${q}"` : 'Search across 272 Delhi wards'}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Top Navbar ─────────────────────────────── */
function Navbar({ onSearch }) {
  const location     = useLocation();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header style={{
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', height: 56, flexShrink: 0, gap: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24, flexShrink: 0 }}>
          <motion.div whileHover={{ rotate: 15, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400 }}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wind size={16} style={{ color: 'var(--brand)' }} />
          </motion.div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>VV-AIR</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1, marginTop: 2 }}>Air Quality Monitor</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="nav-links" style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV.map(({ to, label }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <NavLink key={to} to={to}
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--brand)' : 'var(--text-3)', background: active ? 'var(--brand-dim)' : 'transparent', transition: 'all 0.15s', textDecoration: 'none', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'rgba(128,128,128,0.08)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; } }}
              >{label}</NavLink>
            );
          })}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSearch}
            className="hide-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-3)', fontSize: 12, transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-mid)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Search size={13} /><span>Search…</span>
            <kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(128,128,128,0.08)', fontFamily: 'monospace' }}>⌘K</kbd>
          </motion.button>

          {/* Search icon (mobile) */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onSearch}
            className="theme-btn hamburger" style={{ display: 'none' }}>
            <Search size={15} style={{ color: 'var(--text-3)' }} />
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}
            onClick={toggle} className="theme-btn"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <AnimatePresence mode="wait">
              <motion.div key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0,   opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}>
                {theme === 'dark' ? <Sun size={15} style={{ color: '#fbbf24' }} /> : <Moon size={15} style={{ color: '#6366f1' }} />}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Hamburger (mobile) */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(true)} className="theme-btn hamburger" style={{ display: 'none' }}>
            <Menu size={16} style={{ color: 'var(--text-2)' }} />
          </motion.button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mobile-menu-overlay" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="mobile-menu-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wind size={13} style={{ color: 'var(--brand)' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>VV-AIR</span>
                </div>
                <button onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-3)', padding: 4 }}>
                  <XIcon size={16} />
                </button>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NAV.map(({ to, label }) => (
                  <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
                    style={({ isActive }) => ({
                      padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: isActive ? 700 : 400,
                      color: isActive ? 'var(--brand)' : 'var(--text-2)', background: isActive ? 'var(--brand-dim)' : 'transparent',
                      textDecoration: 'none', transition: 'all 0.15s',
                    })}>
                    {label}
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── App Inner ──────────────────────────────── */
function AppInner() {
  const [showHealth, setShowHealth] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wards, setWards]           = useState([]);

  useEffect(() => {
    if (!localStorage.getItem('userProfile')) setShowHealth(true);
  }, []);

  useEffect(() => {
    import('./services/api').then(m => m.fetchWards().then(setWards).catch(() => {}));
  }, []);

  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <AlertBanner />
      <Navbar onSearch={() => setSearchOpen(true)} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/map"        element={<MapPage />} />
          <Route path="/ward/:id"   element={<WardDetail />} />
          <Route path="/health"     element={<HealthAdvisory />} />
          <Route path="/alerts"     element={<AlertsPage />} />
          <Route path="/crowd"      element={<CrowdSource />} />
          <Route path="/blindspots" element={<BlindSpotsPage />} />
          <Route path="/admin"      element={<AdminPanel />} />
        </Routes>
      </main>

      {showHealth && <HealthModal onClose={() => setShowHealth(false)} />}
      <AnimatePresence>
        {searchOpen && <SearchOverlay wards={wards} onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'var(--bg-card)', color: '#f8fafc', border: '1px solid var(--border)', fontSize: 12, borderRadius: 10 }
      }} />
    </div>
  );
}

/* ── Alerts Page ────────────────────────────── */
function AlertsPage() {
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    import('./services/api').then(m => m.fetchAlerts().then(setAlert).catch(() => {}));
  }, []);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>GRAP Alert Status</h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Graded Response Action Plan — Delhi NCR</p>
      </div>
      {alert ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-danger" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#fca5a5', lineHeight: 1 }}>{alert.avg_aqi}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{alert.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{alert.message}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {alert.actions?.map((a, i) => (
                <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>{a}</span>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-label" style={{ marginBottom: 16 }}>Affected Wards ({alert.affected_count})</div>
            {alert.affected_wards?.slice(0, 20).map(w => (
              <div key={w.ward_id} className="data-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{w.ward_name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{w.aqi}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-3)', paddingTop: 24 }}>Loading alerts…</div>
      )}
    </div>
  );
}

/* ── Blind Spots Page ───────────────────────── */
function BlindSpotsPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    import('./services/api').then(m => m.fetchBlindspots().then(setData).catch(() => {}));
  }, []);

  if (!data) return <div style={{ padding: 40, color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>;

  const { critical_gaps = 0, moderate_gaps = 0, well_covered = 0,
          district_coverage = [], top_5_gap_wards = [], recommended_sensors = [] } = data;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>Sensor Coverage & Blind Spots</h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          {data.real_sensors} real CPCB sensors covering {data.total_wards} wards via IDW interpolation
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Real Sensors', value: data.real_sensors, color: '#22c55e' },
          { label: 'Critical Gaps', value: critical_gaps, color: '#ef4444', sub: 'confidence < 45%' },
          { label: 'Moderate Gaps', value: moderate_gaps, color: '#f97316', sub: '45–65%' },
          { label: 'Well Covered', value: well_covered, color: '#38bdf8', sub: '> 65%' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card-sm" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginTop: 4 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.sub}</div>}
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <span className="section-label">Worst Coverage Wards</span>
          </div>
          {top_5_gap_wards.map((w, i) => (
            <div key={w.ward_id} className="data-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.ward_name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{w.district} · {w.nearest_station}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{Math.round((w.confidence || 0) * 100)}%</div>
                <div style={{ fontSize: 9, color: 'var(--text-3)' }}>confidence</div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <span className="section-label">District Coverage</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 320 }}>
            {district_coverage.map(d => {
              const pct = Math.round(d.avg_confidence * 100);
              const col = pct >= 65 ? '#22c55e' : pct >= 45 ? '#f97316' : '#ef4444';
              return (
                <div key={d.district} className="data-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.district}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{d.real_sensors} real · {d.total_wards} wards</div>
                  </div>
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: col }} />
                    </div>
                    <div style={{ fontSize: 10, color: col, fontWeight: 700, marginTop: 3, textAlign: 'right' }}>{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {recommended_sensors.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-glow">
          <span className="section-label" style={{ display: 'block', marginBottom: 14 }}>Recommended New Sensor Locations</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {recommended_sensors.map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', marginBottom: 6 }}>Sensor #{i + 1}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>{s.district} — near {s.sample_ward}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>{s.lat}°N, {s.lng}°E</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>~{s.wards_covered} wards covered</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter><AppInner /></BrowserRouter>
    </ThemeProvider>
  );
}
