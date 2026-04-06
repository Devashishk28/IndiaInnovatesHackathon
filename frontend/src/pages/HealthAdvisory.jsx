import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Wind, ShieldCheck, AlertTriangle, Edit3,
  Baby, UserCheck, ChevronDown, Phone, Siren,
  Droplets, Thermometer, Eye, Zap,
} from 'lucide-react';
import { fetchSummary } from '../services/api';
import HealthModal from '../components/Health/HealthModal';

// ── helpers ──────────────────────────────────────────────────────────
function getLevel(aqi) {
  if (aqi > 300) return 'severe';
  if (aqi > 200) return 'poor';
  if (aqi > 100) return 'moderate';
  return 'good';
}
function aqiBand(aqi) {
  if (aqi > 400) return '#7e0023';
  if (aqi > 300) return '#8f3f97';
  if (aqi > 200) return '#ef4444';
  if (aqi > 100) return '#f97316';
  if (aqi > 50)  return '#fbbf24';
  return '#22c55e';
}

const LEVEL_BAR  = { severe: 100, poor: 75, moderate: 50, good: 20 };
const LEVEL_DESC = {
  severe:   'Air quality is hazardous. Take all protective measures.',
  poor:     'Air quality is very poor. Limit outdoor exposure significantly.',
  moderate: 'Air quality is moderate. Sensitive groups should take precautions.',
  good:     'Air quality is acceptable. Enjoy outdoor activities.',
};

// ── protocol cards ────────────────────────────────────────────────────
const PROTOCOLS = [
  { icon: Wind,          title: 'Outdoor Exercise',
    severe: 'Avoid all outdoor exercise. Reschedule activities.',
    poor:   'Limit outdoor workouts to 30 min. Wear N95 mask.',
    moderate:'Reduce intense exercise duration.',
    good:   'Outdoor activities are safe.',  color: '#38bdf8' },
  { icon: ShieldCheck,   title: 'Personal Protection',
    severe: 'Wear N95/FFP2 mask at all times outdoors.',
    poor:   'Wear N95 mask when outdoors.',
    moderate:'Carry mask for prolonged outdoor exposure.',
    good:   'No mask required for healthy individuals.', color: '#22c55e' },
  { icon: AlertTriangle, title: 'Sensitive Groups',
    severe: 'Children, elderly, asthma/heart patients: stay home.',
    poor:   'Sensitive groups: minimal outdoor exposure.',
    moderate:'Sensitive groups should reduce outdoor time.',
    good:   'Sensitive groups may exercise with caution.',  color: '#f97316' },
  { icon: Heart,         title: 'Indoor Air Quality',
    severe: 'Keep windows closed. Use air purifier if available.',
    poor:   'Minimise ventilation. Run purifier on high.',
    moderate:'Use purifier during high-traffic hours.',
    good:   'Natural ventilation is fine.',               color: '#a78bfa' },
];

// ── AQI categories table ──────────────────────────────────────────────
const AQI_CATEGORIES = [
  { range: '0–50',   label: 'Good',        color: '#22c55e', text: '#052e16',
    health: 'Minimal impact.', who: 'Everyone', activity: 'Unrestricted outdoor activity' },
  { range: '51–100', label: 'Satisfactory',color: '#a3e635', text: '#1a2e05',
    health: 'Minor breathing discomfort to sensitive people.',
    who: 'Very sensitive groups', activity: 'Reduce prolonged exertion' },
  { range: '101–200',label: 'Moderate',    color: '#fbbf24', text: '#451a03',
    health: 'Breathing discomfort to people with lung/heart disease.',
    who: 'Asthma, heart, elderly', activity: 'Wear mask for extended outdoor stay' },
  { range: '201–300',label: 'Poor',        color: '#f97316', text: '#431407',
    health: 'Breathing discomfort to most people.',
    who: 'Everyone', activity: 'Wear N95; limit outdoor time' },
  { range: '301–400',label: 'Very Poor',   color: '#ef4444', text: '#450a0a',
    health: 'Respiratory illness on prolonged exposure.',
    who: 'Everyone', activity: 'Avoid all outdoor activity' },
  { range: '400+',   label: 'Severe',      color: '#7e0023', text: '#fef2f2',
    health: 'Serious respiratory effects even on light exposure.',
    who: 'Everyone — health emergency', activity: 'Stay indoors; seal windows' },
];

// ── pollutants ────────────────────────────────────────────────────────
const POLLUTANTS = [
  { id:'PM2.5', icon: Droplets,    color:'#38bdf8',
    full:'Fine Particulate Matter (≤2.5 µm)',
    desc:'Tiny particles that penetrate deep into lungs and bloodstream. Primary driver of AQI in Delhi. Sources: vehicles, biomass burning, industrial emissions.',
    safe:'0–30 µg/m³', unit:'µg/m³' },
  { id:'PM10',  icon: Wind,        color:'#a78bfa',
    full:'Coarse Particulate Matter (≤10 µm)',
    desc:'Larger particles from dust, construction, and road traffic. Irritate the upper respiratory tract and eyes.',
    safe:'0–60 µg/m³', unit:'µg/m³' },
  { id:'NO₂',   icon: Zap,         color:'#f97316',
    full:'Nitrogen Dioxide',
    desc:'Emitted mainly by vehicles and power plants. Causes airway inflammation, increases asthma attacks, and reacts to form ozone.',
    safe:'0–40 µg/m³', unit:'µg/m³' },
  { id:'O₃',    icon: Thermometer, color:'#fbbf24',
    full:'Ground-level Ozone',
    desc:'Formed when NOx + VOCs react in sunlight. Peaks in summer afternoons. Triggers coughing, chest tightness, and asthma.',
    safe:'0–50 µg/m³', unit:'µg/m³' },
  { id:'SO₂',   icon: Eye,         color:'#ef4444',
    full:'Sulfur Dioxide',
    desc:'Released by burning coal and diesel. Causes throat irritation and can aggravate existing lung conditions.',
    safe:'0–40 µg/m³', unit:'µg/m³' },
  { id:'CO',    icon: AlertTriangle,color:'#94a3b8',
    full:'Carbon Monoxide',
    desc:'Colourless, odourless gas from incomplete combustion. Reduces blood oxygen capacity; dangerous at high concentrations.',
    safe:'0–1.0 mg/m³', unit:'mg/m³' },
];

// ── protective measures ───────────────────────────────────────────────
const PROTECTIONS = [
  { level:'Good (0–100)',   color:'#22c55e', bg:'rgba(34,197,94,0.08)',
    measures:['Enjoy outdoor activities freely','No mask required for healthy adults','Open windows for natural ventilation','Normal exercise routines'] },
  { level:'Moderate (101–200)',color:'#fbbf24', bg:'rgba(251,191,36,0.08)',
    measures:['Wear surgical mask for outdoor stays > 1 hour','Reduce peak-hour commuting','Use air purifier indoors during rush hours','Stay hydrated; wash face after going out'] },
  { level:'Poor (201–300)', color:'#f97316', bg:'rgba(249,115,22,0.08)',
    measures:['Wear N95/KN95 mask whenever outdoors','Keep windows closed during rush hours','Run HEPA air purifier indoors','Limit all non-essential outdoor trips'] },
  { level:'Very Poor / Severe (300+)',color:'#ef4444', bg:'rgba(239,68,68,0.08)',
    measures:['Wear N95 or P100 respirator at all times outdoors','Seal window gaps with damp cloth if no purifier','Cancel outdoor events; work from home if possible','Seek medical help if experiencing chest pain or difficulty breathing'] },
];

// ── vulnerable groups ─────────────────────────────────────────────────
const VULNERABLE = [
  { icon:'👶', label:'Children',
    risk:'Developing lungs absorb more pollutants per kg of body weight. Higher exposure risk during outdoor play.',
    tips:['Restrict outdoor play when AQI > 150','Ensure school windows remain closed on high-pollution days','Keep inhalers accessible for children with asthma','Monitor for persistent cough or wheezing'] },
  { icon:'🧓', label:'Elderly (65+)',
    risk:'Reduced lung capacity and weaker immune response increase susceptibility to respiratory and cardiovascular effects.',
    tips:['Avoid morning walks when AQI > 200 (peak hour 6–9 AM)','Increase medical check-up frequency in winter months','Wear N95 mask for all outdoor errands','Keep emergency medications readily available'] },
  { icon:'🤰', label:'Pregnant Women',
    risk:'Pollutant exposure linked to preterm birth, low birth weight, and developmental complications.',
    tips:['Minimise outdoor exposure when AQI > 150','Use HEPA purifier in bedroom throughout pregnancy','Stay hydrated with clean water; avoid street food on high-pollution days','Consult gynaecologist about additional precautions'] },
  { icon:'❤️', label:'Heart & Lung Patients',
    risk:'PM2.5 enters bloodstream and triggers inflammation that can precipitate heart attacks and worsen COPD or asthma.',
    tips:['Follow a personalised action plan from your doctor','Monitor pulse-oximetry readings daily when AQI is high','Have rescue inhalers and nitroglycerin accessible','Call emergency services if chest pain, breathlessness, or SpO₂ < 95%'] },
];

// ── FAQ ───────────────────────────────────────────────────────────────
const FAQS = [
  { q:'What is AQI and how is it calculated?',
    a:'The Air Quality Index (AQI) is a standardised scale (0–500) used by CPCB to communicate air quality. It is calculated from the measured concentration of 8 pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃, Pb). The pollutant with the highest sub-index determines the final AQI.' },
  { q:'Is wearing a cloth mask enough protection?',
    a:'No. Cloth masks filter less than 30% of fine PM2.5 particles. For effective protection when AQI > 200, use a certified N95 (filters 95% of particles ≥0.3 µm) or N99/P100 respirator. Ensure a tight seal around nose and cheeks.' },
  { q:'When is Delhi\'s pollution the worst?',
    a:'Pollution peaks between October and February due to crop residue burning in Punjab/Haryana, drop in mixing height (cold temperature traps pollutants), increased heating demand, and calm winds. The worst days typically occur around Diwali (October–November).' },
  { q:'Can indoor air purifiers really help?',
    a:'Yes — a HEPA purifier in a sealed room can reduce indoor PM2.5 by 60–80%. Look for purifiers with HEPA + activated carbon filters. Ensure the unit\'s CADR (Clean Air Delivery Rate) is appropriate for the room size: ~5× room volume (m³) per hour is recommended.' },
  { q:'Is it safe for me to run outdoors?',
    a:'When AQI < 100, running is generally safe. Between 101–200, reduce intensity and duration, especially if you have asthma. When AQI > 200, switch to indoor exercise. Never run outdoors when AQI > 300 — even short exposures at that level cause measurable lung function decline.' },
  { q:'How do I check real-time AQI near me?',
    a:'Use the VV-AIR map on this platform, CPCB\'s Sameer App, or WAQI (aqicn.org) for Delhi-wide station data. Data is updated hourly from CPCB-certified continuous monitoring stations.' },
];

// ── emergency info ────────────────────────────────────────────────────
const HELPLINES = [
  { label:'National Pollution Control Board', number:'1800-11-4000', type:'Pollution Complaints', color:'#38bdf8' },
  { label:'Delhi Pollution Control Committee', number:'011-2731-8802', type:'DPCC Helpline', color:'#22c55e' },
  { label:'Emergency Medical Services', number:'112', type:'Medical Emergency', color:'#ef4444' },
  { label:'AIIMS Emergency', number:'011-2659-4444', type:'Hospital', color:'#f97316' },
  { label:'Safdarjung Hospital', number:'011-2673-0000', type:'Hospital', color:'#a78bfa' },
];

const EMERGENCY_SIGNS = [
  'Severe shortness of breath or inability to speak full sentences',
  'Chest pain or tightness that does not resolve with rest',
  'Bluish tint to lips or fingernails (cyanosis)',
  'SpO₂ reading below 94% on pulse oximeter',
  'Confusion, extreme dizziness, or loss of consciousness',
  'Wheezing that does not respond to rescue inhaler',
];

// ── sub-components ────────────────────────────────────────────────────
function Section({ title, delay = 0, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4,0,0.2,1] }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 16, borderRadius: 99, background: 'var(--brand)', display: 'inline-block' }} />
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(o => !o)}>
        {q}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ans"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4,0,0.2,1] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="faq-answer">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────
export default function HealthAdvisory() {
  const [summary, setSummary]     = useState(null);
  const [profile, setProfile]     = useState(() => JSON.parse(localStorage.getItem('userProfile') || 'null'));
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchSummary().then(setSummary).catch(() => {}); }, []);

  const aqi   = summary?.avg_aqi || 200;
  const level = getLevel(aqi);
  const color = aqiBand(aqi);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>Health Advisory</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Personalised guidance based on current Delhi AQI</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            fontSize: 12, color: 'var(--text-3)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <Edit3 size={12} />
          {profile ? `${profile.ageGroup} · ${profile.condition}` : 'Set Health Profile'}
        </button>
      </div>

      {/* ── Current AQI band ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={level === 'severe' ? 'card-danger' : 'card-glow'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1 }}>{aqi}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Avg AQI</div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
              {summary?.grap_stage?.label || 'Loading…'}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{LEVEL_DESC[level]}</p>
            <div style={{ marginTop: 10 }} className="progress-bar-track">
              <motion.div
                className="progress-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${LEVEL_BAR[level]}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ background: color }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Protocol Cards ── */}
      <Section title="Current Recommendations" delay={0.05}>
        <div className="rg-2" style={{ gap: 14 }}>
          {PROTOCOLS.map((p, i) => (
            <motion.div key={p.title}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.07 }}
              className="card stat-card-lift"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${p.color}20`, flexShrink: 0 }}>
                  <p.icon size={16} style={{ color: p.color }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{p.title}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>{p[level]}</p>
              <div style={{ marginTop: 12, height: 3, borderRadius: 99, background: 'rgba(128,128,128,0.1)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${LEVEL_BAR[level]}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.1 + i * 0.07 }}
                  style={{ height: '100%', borderRadius: 99, background: p.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Personalised tip ── */}
      <AnimatePresence>
        {profile && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-glow"
          >
            <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>Personalised Advice</span>
            <PersonalisedTip profile={profile} aqi={aqi} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. AQI Categories & Health Implications ── */}
      <Section title="AQI Categories & Health Implications" delay={0.1}>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 110px 1fr 140px', background: 'var(--bg-elevated)', padding: '8px 14px', gap: 12 }}>
            {['Range','Category','Health Impact','Activity Guidance'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
            ))}
          </div>
          {AQI_CATEGORIES.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              style={{
                display: 'grid', gridTemplateColumns: '90px 110px 1fr 140px',
                padding: '10px 14px', gap: 12, alignItems: 'center',
                borderTop: '1px solid var(--border)',
                background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.range}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: c.color, color: c.text, padding: '2px 8px', borderRadius: 6 }}>{c.label}</span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{c.health}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.activity}</span>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── 2. Understanding Pollutants ── */}
      <Section title="Understanding Pollutants" delay={0.15}>
        <div className="rg-3" style={{ gap: 12 }}>
          {POLLUTANTS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="card-sm"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${p.color}18`, flexShrink: 0 }}>
                  <p.icon size={14} style={{ color: p.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{p.id}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Safe: {p.safe}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: p.color, marginBottom: 5 }}>{p.full}</div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.65 }}>{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── 3. Protective Measures ── */}
      <Section title="Protective Measures" delay={0.2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROTECTIONS.map((p, i) => (
            <motion.div
              key={p.level}
              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.07 }}
              style={{ borderRadius: 10, border: `1px solid ${p.color}30`, background: p.bg, padding: '12px 16px' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.level}</div>
              <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '5px 16px' }}>
                {p.measures.map((m, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                    <span style={{ color: p.color, flexShrink: 0, marginTop: 1 }}>▸</span>{m}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── 4. Vulnerable Groups ── */}
      <Section title="Vulnerable Groups — Special Precautions" delay={0.25}>
        <div className="rg-2" style={{ gap: 14 }}>
          {VULNERABLE.map((g, i) => (
            <motion.div
              key={g.label}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className="card stat-card-lift"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{g.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{g.label}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>{g.risk}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {g.tips.map((t, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                    <span style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }}>▸</span>{t}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── 5. FAQ ── */}
      <Section title="Frequently Asked Questions" delay={0.3}>
        <div className="card" style={{ padding: '4px 20px' }}>
          {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </Section>

      {/* ── 6. Emergency Information ── */}
      <Section title="Emergency Information" delay={0.35}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Helplines */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Phone size={14} style={{ color: '#22c55e' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Helplines & Contacts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {HELPLINES.map((h, i) => (
                <motion.div
                  key={h.number}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)' }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{h.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{h.type}</div>
                  </div>
                  <a
                    href={`tel:${h.number}`}
                    style={{ fontSize: 13, fontWeight: 700, color: h.color, textDecoration: 'none', letterSpacing: '0.02em' }}
                  >
                    {h.number}
                  </a>
                </motion.div>
              ))}
            </div>
          </div>

          {/* When to seek help */}
          <div className="card-danger" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Siren size={14} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Seek Emergency Care If…</span>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EMERGENCY_SIGNS.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-2)' }}
                >
                  <span style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }}>⚠</span>{s}
                </motion.li>
              ))}
            </ul>
          </div>

        </div>
      </Section>

      {showModal && <HealthModal onClose={p => { setProfile(p); setShowModal(false); }} />}
    </div>
  );
}

function PersonalisedTip({ profile, aqi }) {
  const tips  = [];
  const level = getLevel(aqi);
  if (profile.condition === 'asthma') {
    tips.push('Keep your inhaler accessible at all times during high pollution days.');
    if (level === 'severe' || level === 'poor') tips.push('Use nebuliser or spacer device as prescribed.');
  }
  if (profile.condition === 'heart')    tips.push('Avoid physical exertion outdoors. Monitor blood pressure closely.');
  if (profile.condition === 'pregnant') tips.push('Minimise outdoor exposure. Stay hydrated and use air purifier indoors.');
  if (profile.ageGroup === 'child')     tips.push("Children's lungs are more vulnerable. School outdoor activities should be restricted.");
  if (profile.ageGroup === 'senior')    tips.push('Elderly are at elevated risk. Avoid morning walks when pollution peaks.');
  if (!tips.length) tips.push('Maintain general precautions as per current AQI level.');
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {tips.map((t, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--brand)', marginTop: 1, flexShrink: 0 }}>▸</span> {t}
        </li>
      ))}
    </ul>
  );
}
