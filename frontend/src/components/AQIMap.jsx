import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';

const AQIMap = () => {
  const [wards, setWards] = useState([]);
  const delhiCenter = [28.6139, 77.2090];

  useEffect(() => {
    api.get('/wards').then(res => setWards(res.data.data || []));
  }, []);

  const getAqiColor = (aqi) => {
    if (aqi <= 50) return '#34d399';
    if (aqi <= 100) return '#fbbf24';
    if (aqi <= 200) return '#fb923c';
    return '#f43f5e';
  };

  const getAqiLabel = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    return 'Critical';
  };

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        borderRadius: '1.5rem',
        border: '1px solid rgba(148, 163, 184, 0.08)',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(148, 163, 184, 0.04)',
      }}
    >
      <MapContainer
        center={delhiCenter}
        zoom={11}
        className="h-full w-full"
        zoomControl={false}
        style={{ background: '#020617' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {wards.map(w => {
          const color = getAqiColor(w.aqi);
          return (
            <CircleMarker
              key={w.id}
              center={[w.lat, w.lng]}
              radius={8 + (w.aqi / 25)}
              pathOptions={{
                fillColor: color,
                color: color,
                weight: 1.5,
                fillOpacity: 0.35,
                opacity: 0.7,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', padding: '4px 0' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', marginBottom: '4px' }}>
                    {w.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '18px',
                      color: color,
                    }}>
                      {Math.round(w.aqi)}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: color,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: `${color}18`,
                      border: `1px solid ${color}30`,
                    }}>
                      {getAqiLabel(w.aqi)}
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default AQIMap;