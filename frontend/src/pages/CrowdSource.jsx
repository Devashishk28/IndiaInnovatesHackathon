import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MapPin, Send, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { fetchCrowdsource, submitCrowdsource } from '../services/api';

const VISUAL_OPTIONS = [
  { value: 'Clear',             label: 'Clear Sky',         icon: '☀️', color: '#22c55e' },
  { value: 'Mild Haze',         label: 'Mild Haze',         icon: '🌤️', color: '#84cc16' },
  { value: 'Dust Haze',         label: 'Dust / Smog',       icon: '🌫️', color: '#fbbf24' },
  { value: 'Vehicle Exhaust',   label: 'Vehicle Exhaust',   icon: '🚗', color: '#f97316' },
  { value: 'Heavy Smoke',       label: 'Heavy Smoke',       icon: '💨', color: '#ef4444' },
  { value: 'Industrial Fumes',  label: 'Industrial Fumes',  icon: '🏭', color: '#dc2626' },
];

const SEVERITY_LABELS = ['', 'Barely Noticeable', 'Mild', 'Moderate', 'Bad', 'Very Bad'];

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

function severityColor(s) {
  return ['', '#22c55e', '#84cc16', '#fbbf24', '#f97316', '#ef4444'][s] || '#94a3b8';
}

export default function CrowdSource() {
  const [readings, setReadings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [locError, setLocError]   = useState('');
  const [form, setForm] = useState({
    lat: '', lng: '', visual: 'Mild Haze', severity: 2, note: '', reporter: '',
  });

  useEffect(() => {
    fetchCrowdsource().then(d => { setReadings(d.readings || []); setLoading(false); });
  }, []);

  function getLocation() {
    setLocError('');
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) })),
      () => setLocError('Location denied — enter coordinates manually'),
      { timeout: 8000 },
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.lat || !form.lng) { setLocError('Please provide location'); return; }
    setSubmitting(true);
    try {
      await submitCrowdsource({
        lat:      parseFloat(form.lat),
        lng:      parseFloat(form.lng),
        visual:   form.visual,
        severity: form.severity,
        note:     form.note,
        reporter: form.reporter || 'Anonymous',
      });
      setSubmitted(true);
      // Reload
      const d = await fetchCrowdsource();
      setReadings(d.readings || []);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ lat: '', lng: '', visual: 'Mild Haze', severity: 2, note: '', reporter: '' });
      }, 3000);
    } catch {
      setLocError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedVisual = VISUAL_OPTIONS.find(o => o.value === form.visual);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={16} style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>Crowd-Sourced Observations</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Report what you see around you — help fill data gaps</p>
        </div>
        <div style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 20, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', fontSize: 11, color: 'var(--brand)' }}>
          {readings.length} active reports
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Submit Form */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <span className="section-label" style={{ display: 'block', marginBottom: 16 }}>Submit Observation</span>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', textAlign: 'center' }}>
                <CheckCircle size={40} style={{ color: '#22c55e' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>Observation submitted!</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Thank you for contributing to Delhi's air quality network</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Location */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>Your Location</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      placeholder="Latitude (e.g. 28.6469)"
                      value={form.lat}
                      onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                      className="search-input"
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12 }}
                    />
                    <input
                      placeholder="Longitude (e.g. 77.3152)"
                      value={form.lng}
                      onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                      className="search-input"
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12 }}
                    />
                    <button type="button" onClick={getLocation}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--brand)', fontSize: 12, flexShrink: 0, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <MapPin size={13} /> Auto
                    </button>
                  </div>
                  {locError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{locError}</p>}
                </div>

                {/* Visual */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>What do you see?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {VISUAL_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, visual: opt.value }))}
                        style={{
                          padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                          border: form.visual === opt.value ? `1px solid ${opt.color}` : '1px solid var(--border)',
                          background: form.visual === opt.value ? `${opt.color}14` : 'transparent',
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ fontSize: 20 }}>{opt.icon}</div>
                        <div style={{ fontSize: 10, color: form.visual === opt.value ? opt.color : 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Severity</span>
                    <span style={{ color: severityColor(form.severity), fontWeight: 600 }}>{SEVERITY_LABELS[form.severity]}</span>
                  </label>
                  <input type="range" min="1" max="5" value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: severityColor(form.severity) }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
                    <span>Mild</span><span>Very Bad</span>
                  </div>
                </div>

                {/* Note + Reporter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Note (optional)</label>
                    <input
                      placeholder="e.g. factory smoke near market"
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      className="search-input"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>Your Name (optional)</label>
                    <input
                      placeholder="Anonymous"
                      value={form.reporter}
                      onChange={e => setForm(f => ({ ...f, reporter: e.target.value }))}
                      className="search-input"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12 }}
                    />
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 0', borderRadius: 10, background: '#0284c7', color: '#fff',
                    fontSize: 13, fontWeight: 600, opacity: submitting ? 0.6 : 1, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#0369a1'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
                >
                  <Send size={13} />
                  {submitting ? 'Submitting…' : 'Submit Observation'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Readings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="section-label">Recent Observations</span>
          {loading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence>
                {readings.map((r, i) => {
                  const vis = VISUAL_OPTIONS.find(o => o.value === r.visual) || VISUAL_OPTIONS[1];
                  return (
                    <motion.div key={r.id}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{vis.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: vis.color }}>{vis.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
                          <Clock size={10} />
                          {timeAgo(r.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          {r.note && <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>{r.note}</p>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[1,2,3,4,5].map(n => (
                                <div key={n} style={{ width: 14, height: 4, borderRadius: 2, background: n <= r.severity ? severityColor(r.severity) : 'rgba(255,255,255,0.08)' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{r.reporter}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: vis.color }}>{r.aqi_est}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-3)' }}>est. AQI</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: 10 }}>
        <AlertTriangle size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          Crowd observations are visual estimates and supplement — not replace — official CPCB sensor data.
          Reports expire after 6 hours. Severity estimates are mapped to approximate AQI ranges for display purposes only.
        </p>
      </div>
    </div>
  );
}
