import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { aqiColor } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const DELHI_CENTER = [28.6139, 77.2090];

function AQILegend() {
  return (
    <div
      className="leaflet-bottom leaflet-right"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="leaflet-control"
        style={{
          background: 'rgba(15,23,42,0.92)',
          border: '1px solid rgba(56,189,248,0.15)',
          borderRadius: 12,
          padding: '10px 14px',
          color: '#f1f5f9',
          fontSize: 11,
          marginBottom: 8,
          marginRight: 8,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 10, letterSpacing: '0.1em', color: '#94a3b8' }}>
          AQI LEGEND
        </div>
        {[
          ['0–50',   '#00e400', 'Good'],
          ['51–100', '#ffff00', 'Satisfactory'],
          ['101–200','#ff7e00', 'Moderate'],
          ['201–300','#ff0000', 'Poor'],
          ['301–400','#8f3f97', 'Very Poor'],
          ['401+',   '#7e0023', 'Severe'],
        ].map(([range, color, label]) => (
          <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: 10 }}>{range}</span>
            <span style={{ color: '#f1f5f9', fontSize: 10, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #38bdf8', flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: 10 }}>CPCB Station</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px dashed #64748b', flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: 10 }}>Estimated (EST)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WardMarkers({ wards, navigate }) {
  return wards.map(ward => {
    const color   = aqiColor(ward.aqi);
    const isReal  = ward.is_real_station;
    const radius  = isReal ? 12 : 8;
    const opacity = isReal ? 0.88 : 0.65;

    return (
      <CircleMarker
        key={ward.ward_id}
        center={[ward.lat, ward.lng]}
        radius={radius}
        pathOptions={{
          fillColor:   color,
          fillOpacity: opacity,
          color:       isReal ? '#38bdf8' : '#475569',
          weight:      isReal ? 2 : 1,
          dashArray:   isReal ? null : '3,3',
        }}
        eventHandlers={{
          click: () => navigate && navigate(`/ward/${ward.ward_id}`),
        }}
      >
        <Popup>
          <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{ward.ward_name}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{ward.district}</div>
              </div>
              {!isReal && (
                <span style={{ fontSize: 9, background: 'rgba(100,116,139,0.2)', color: '#94a3b8',
                               padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>EST</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>
                {ward.aqi}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color }}>{ward.category}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>AQI Index</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11, marginBottom: 8 }}>
              {[['PM2.5', ward.pm25, 'µg/m³'], ['PM10', ward.pm10, 'µg/m³'],
                ['NO₂',  ward.no2,  'µg/m³'], ['Source', ward.source, '']].map(([k,v,u]) => (
                <div key={k}>
                  <span style={{ color: '#64748b' }}>{k} </span>
                  <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{v}{u ? ' '+u : ''}</span>
                </div>
              ))}
            </div>
            {ward.grap && ward.grap.stage > 0 && (
              <div style={{ fontSize: 10, background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                             padding: '4px 8px', borderRadius: 6, marginBottom: 6 }}>
                {ward.grap.label}
              </div>
            )}
            {!isReal && (
              <div style={{ fontSize: 10, color: '#64748b' }}>
                Confidence: {Math.round((ward.confidence || 0.5) * 100)}% · IDW interpolated
              </div>
            )}
          </div>
        </Popup>
      </CircleMarker>
    );
  });
}

export default function DelhiMap({ wards = [], navigate, height = '100%' }) {
  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={DELHI_CENTER}
        zoom={11}
        style={{ height: '100%', width: '100%', borderRadius: 16 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <WardMarkers wards={wards} navigate={navigate} />
        <AQILegend />
      </MapContainer>
    </div>
  );
}
