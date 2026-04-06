import React from 'react';
import { LayoutDashboard, Map as MapIcon, ShieldAlert, Activity, Radio, Cpu, Sparkles } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'advisory', label: 'Health Advisory', icon: ShieldAlert },
  ];

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex flex-col"
      style={{
        width: '16rem',
        height: '100vh',
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(32px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
        borderRight: '1px solid rgba(148, 163, 184, 0.06)',
      }}
    >
      {/* ── Ambient corner glow ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-40px',
          left: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.06), transparent 70%)',
        }}
      />

      {/* ── Brand ── */}
      <div className="px-6 pt-8 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl animate-pulse-brand"
            style={{
              width: '2.75rem',
              height: '2.75rem',
              background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.05))',
              border: '1px solid rgba(56,189,248,0.25)',
            }}
          >
            <Cpu size={20} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight" style={{ color: '#f1f5f9' }}>
              VV-AIR <span style={{ color: '#38bdf8' }}>AI</span>
            </h1>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: '#475569' }}
            >
              Delhi Command
            </p>
          </div>
        </div>
      </div>

      {/* ── Separator ── */}
      <div
        className="mx-5 mb-5"
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.1), rgba(148, 163, 184, 0.06), transparent)',
        }}
      />

      {/* ── Label ── */}
      <p
        className="px-6 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2"
        style={{ color: '#475569' }}
      >
        <Sparkles size={10} />
        Navigation
      </p>

      {/* ── Nav Items ── */}
      <nav className="flex-1 flex flex-col gap-1.5 px-3">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? 'nav-item-active' : ''
                }`}
              style={{
                color: isActive ? '#38bdf8' : '#64748b',
              }}
            >
              <item.icon size={18} />
              <span className="text-sm font-semibold">{item.label}</span>
              {isActive && (
                <div
                  className="ml-auto rounded-full"
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#38bdf8',
                    boxShadow: '0 0 10px rgba(56,189,248,0.7)',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── System Status Panel ── */}
      <div className="m-4 mt-auto">
        {/* Separator */}
        <div
          className="mb-4"
          style={{
            height: '1px',
            background:
              'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.08), transparent)',
          }}
        />

        {/* Status card */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(52, 211, 153, 0.08)',
            boxShadow: 'inset 0 1px 0 rgba(52, 211, 153, 0.04)',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3"
            style={{ color: '#475569' }}
          >
            System Status
          </p>

          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="rounded-full animate-pulse-glow"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#34d399',
              }}
            />
            <span className="text-xs font-extrabold tracking-wider" style={{ color: '#34d399' }}>
              ONLINE
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Radio size={12} style={{ color: '#475569' }} />
            <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>
              40+ Nodes Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Activity size={12} style={{ color: '#475569' }} />
            <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>
              Delhi Grid Monitoring
            </span>
          </div>

          {/* Uptime bar */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.04)' }}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                Uptime
              </span>
              <span className="text-[9px] font-bold" style={{ color: '#34d399' }}>
                99.8%
              </span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: '99.8%', background: 'linear-gradient(90deg, #34d399, #10b981)' }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;