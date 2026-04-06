import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogOut, RefreshCw, AlertTriangle, Shield, ChevronUp, ChevronDown } from 'lucide-react';
import { login, logout, fetchAdminWards, fetchAdminLogs, generatePolicy, aqiColor } from '../services/api';

const PRIORITY = {
  CRITICAL: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  text: '#f87171' },
  HIGH:     { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', text: '#fb923c' },
  WARNING:  { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.2)',  text: '#fbbf24' },
  ADVISORY: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)', text: '#38bdf8' },
};

function LoginForm({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      localStorage.setItem('aqi_token', data.token);
      localStorage.setItem('aqi_user', JSON.stringify(data));
      onLogin(data);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card-glow" style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={17} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Admin Portal</h2>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Delhi AQI Intelligence Platform</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="search-input" style={{ width: '100%', padding: '8px 12px', borderRadius: 9 }}
              placeholder="admin@delhi.gov.in" type="email" required />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              className="search-input" style={{ width: '100%', padding: '8px 12px', borderRadius: 9 }}
              placeholder="••••••••" type="password" required />
          </div>
          {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ padding: '10px 0', borderRadius: 10, background: '#0284c7', color: '#fff', fontSize: 13, fontWeight: 600, opacity: loading ? 0.5 : 1, transition: 'background 0.15s' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0369a1'; }}
            onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 16, textAlign: 'center' }}>
          Demo: admin@delhi.gov.in / Admin@123
        </p>
      </motion.div>
    </div>
  );
}

export default function AdminPanel() {
  const [user, setUser]     = useState(() => {
    const u = localStorage.getItem('aqi_user');
    const t = localStorage.getItem('aqi_token');
    return u && t ? JSON.parse(u) : null;
  });
  const [tab, setTab]       = useState('wards');
  const [wards, setWards]   = useState([]);
  const [logs, setLogs]     = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('aqi');
  const [sortDir, setSortDir] = useState(-1);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchAdminWards(), fetchAdminLogs()])
      .then(([w, l]) => { setWards(w.wards || []); setLogs(l.logs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  function handleLogout() {
    logout();
    localStorage.removeItem('aqi_token');
    localStorage.removeItem('aqi_user');
    setUser(null);
  }

  async function loadPolicy() {
    setLoading(true);
    const p = await generatePolicy().catch(() => null);
    setPolicy(p);
    setLoading(false);
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(-1); }
  }

  const sortedWards = [...wards].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number') return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  if (!user) return <LoginForm onLogin={setUser} />;

  const TABS = ['wards', 'policy', 'logs'];
  const COL_HEADERS = [['ward_name','Ward'],['district','District'],['aqi','AQI'],['pm25','PM2.5'],['source','Source'],['category','Status']];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Shield size={15} style={{ color: 'var(--brand)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Admin Panel</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{user.name} · {user.role}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '4px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: tab === t ? '#0284c7' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (tab !== t) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (tab !== t) e.currentTarget.style.background = 'transparent'; }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={handleLogout}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          <LogOut size={13} /> Logout
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* WARDS TAB */}
        {tab === 'wards' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span className="section-label">All 272 Wards</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{wards.length} loaded</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: 'var(--text-3)', fontSize: 12 }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {COL_HEADERS.map(([k, l]) => (
                        <th key={k}
                          onClick={() => toggleSort(k)}
                          style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                        >
                          {l} {sortKey === k ? (sortDir === -1 ? '↓' : '↑') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWards.map(w => (
                      <tr key={w.ward_id} className="data-row" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--text-2)' }}>{w.ward_name}</td>
                        <td style={{ padding: '8px 14px', color: 'var(--text-3)' }}>{w.district}</td>
                        <td style={{ padding: '8px 14px', fontWeight: 700, color: aqiColor(w.aqi) }}>{w.aqi}</td>
                        <td style={{ padding: '8px 14px', color: 'var(--text-3)' }}>{w.pm25}</td>
                        <td style={{ padding: '8px 14px', color: 'var(--text-3)' }}>{w.source}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${aqiColor(w.aqi)}20`, color: aqiColor(w.aqi) }}>
                            {w.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* POLICY TAB */}
        {tab === 'policy' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={loadPolicy} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, background: '#0284c7', color: '#fff', fontSize: 12, fontWeight: 600, opacity: loading ? 0.5 : 1, transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0369a1'; }}
                onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
              >
                <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                Generate Policy Recommendations
              </button>
              {policy && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Generated {new Date(policy.generated_at).toLocaleTimeString()}</span>}
            </div>
            {policy?.recommendations?.map((rec, i) => {
              const pc = PRIORITY[rec.priority] || PRIORITY.ADVISORY;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: pc.text }}>{rec.priority}</span>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 3 }}>{rec.ward_name}</h3>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{rec.district} · Source: {rec.source} · AQI: {rec.aqi}</p>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 900, color: aqiColor(rec.aqi) }}>{rec.aqi}</span>
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {rec.actions.map((a, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
                        <span style={{ color: pc.text, marginTop: 1, flexShrink: 0 }}>▸</span> {a}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span className="section-label">Activity Log</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {logs.map((log, i) => (
                <div key={i} className="data-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{log.event}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{new Date(log.ts).toLocaleString()}</p>
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>{log.level}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
