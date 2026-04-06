import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, X } from 'lucide-react';

const AGE_GROUPS = [
  { id: 'child',       label: 'Child',       desc: 'Under 12 years',   icon: '👶' },
  { id: 'young',       label: 'Young Adult', desc: '13–35 years',      icon: '🧑' },
  { id: 'middle',      label: 'Middle Aged', desc: '36–60 years',      icon: '🧔' },
  { id: 'senior',      label: 'Senior',      desc: '60+ years',        icon: '👴' },
];

const CONDITIONS = [
  { id: 'none',        label: 'No Condition',    icon: '✅' },
  { id: 'asthma',      label: 'Asthma',          icon: '🫁' },
  { id: 'heart',       label: 'Heart Disease',   icon: '❤️' },
  { id: 'diabetes',    label: 'Diabetes',        icon: '💉' },
  { id: 'pregnant',    label: 'Pregnant',        icon: '🤰' },
];

export default function HealthModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [ageGroup, setAgeGroup] = useState('');
  const [condition, setCondition] = useState('');

  function save() {
    const profile = { ageGroup, condition, saved: new Date().toISOString() };
    localStorage.setItem('userProfile', JSON.stringify(profile));
    onClose(profile);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <motion.div
          className="relative glass-card-glow w-full max-w-md z-10"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <Heart size={18} className="text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Health Profile</h2>
                <p className="text-xs text-gray-400">Personalise your air quality advice</p>
              </div>
            </div>
          </div>

          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest font-semibold">Select Age Group</p>
              <div className="grid grid-cols-2 gap-3">
                {AGE_GROUPS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setAgeGroup(g.id)}
                    className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                      ageGroup === g.id
                        ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                        : 'border-white/5 bg-white/3 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-2xl mb-1">{g.icon}</span>
                    <span className="text-sm font-semibold">{g.label}</span>
                    <span className="text-[10px] text-gray-500">{g.desc}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => ageGroup && setStep(1)}
                disabled={!ageGroup}
                className="mt-6 w-full py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-sky-500 transition-colors"
              >
                Next →
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest font-semibold">Health Condition</p>
              <div className="flex flex-col gap-2">
                {CONDITIONS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCondition(c.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      condition === c.id
                        ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                        : 'border-white/5 bg-white/3 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-sm font-semibold">{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={save}
                  disabled={!condition}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-sky-500 transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
