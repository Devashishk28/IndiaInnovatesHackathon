import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PredictionChart = ({ data, title }) => {
  const chartData = data || [
    { hour: '+1h', aqi: 85 },
    { hour: '+2h', aqi: 120 },
    { hour: '+3h', aqi: 190 },
    { hour: '+4h', aqi: 240 },
    { hour: '+5h', aqi: 210 },
    { hour: '+6h', aqi: 180 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const aqi = payload[0].value;
    let color = '#34d399';
    if (aqi > 200) color = '#f43f5e';
    else if (aqi > 100) color = '#fbbf24';
    else if (aqi > 50) color = '#fb923c';

    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 16px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}
        </p>
        <p style={{ fontSize: '18px', fontWeight: 800, color: color, margin: 0 }}>{aqi}</p>
        <p style={{ fontSize: '9px', fontWeight: 600, color: '#334155', margin: '2px 0 0 0' }}>AQI INDEX</p>
      </div>
    );
  };

  return (
    <div>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <div
            style={{
              width: '3px',
              height: '14px',
              borderRadius: '2px',
              background: 'linear-gradient(180deg, #38bdf8, #0ea5e9)',
            }}
          />
          <h4
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: '#475569' }}
          >
            {title}
          </h4>
        </div>
      )}

      <div style={{ height: '200px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="hour"
              stroke="#334155"
              fontSize={10}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="#334155"
              fontSize={10}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(56,189,248,0.15)', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="aqi"
              stroke="url(#strokeGradient)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#chartGradient)"
              animationDuration={1500}
              animationEasing="ease-out"
              dot={false}
              activeDot={{
                r: 5,
                fill: '#38bdf8',
                stroke: '#020617',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' },
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictionChart;