# Delhi AQI Intelligence Platform

Government-grade Air Quality Intelligence Platform for Delhi NCR — 272 monitoring points, ML-powered source detection, GRAP alerts.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (optional — falls back gracefully)

---

### Backend (FastAPI)

```bash
cd backend

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Train ML models (takes ~30s)
python models/train_model.py

# 3. Start the server
uvicorn main:app --reload --port 8000
```

API available at: http://localhost:8000
Swagger docs: http://localhost:8000/docs

---

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

---

## Architecture

```
backend/
  main.py                 FastAPI app entry point
  data/delhi_wards.py     272 Delhi wards (20 CPCB + 252 interpolated)
  models/
    train_model.py        Train source detector + AQI forecaster
    source_detector.pkl   Random Forest (95% accuracy)
    aqi_forecaster.pkl    XGBoost 24-hour forecaster
  services/
    waqi_service.py       WAQI live API + mock fallback
    interpolation_service.py  IDW spatial interpolation
  routers/
    wards.py             GET /api/wards, /api/wards/{id}, /api/summary
    ml.py                POST /api/predict/source, /api/predict/aqi
    alerts.py            GET /api/alerts (GRAP stage auto-computed)
    auth.py              POST /api/auth/login (JWT)
    admin.py             GET /api/admin/* (JWT protected)
    reports.py           POST/GET /api/reports, /api/blindspots

frontend/src/
  App.jsx                Router + layout + health modal
  services/api.js        All API calls with mock fallback
  pages/
    Dashboard.jsx        Summary cards + full map + source panel
    MapView.jsx          Full-screen 272-ward map
    WardDetail.jsx       Pollutant breakdown + 24h forecast
    HealthAdvisory.jsx   Personalised health protocols
    AdminPanel.jsx       JWT-protected admin interface
  components/
    Map/DelhiMap.jsx     Leaflet map with 272 markers
    GRAP/AlertBanner.jsx Persistent GRAP stage banner
    Health/HealthModal.jsx First-visit health profile
    SourceDetection/SourceChart.jsx  Animated source bars
```

## API Keys

Copy `.env.example` to `backend/.env` and fill in your keys:

- `WAQI_API_KEY` — https://aqicn.org/api/
- `OPENAQ_API_KEY` — https://openaq.org/
- `WEATHER_API_KEY` — https://www.weatherapi.com/
- `NEWS_API_KEY` — https://newsapi.org/

All APIs have mock fallbacks — the platform works offline.

## Admin Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@delhi.gov.in | Admin@123 | Admin |
| superadmin@delhi.gov.in | Super@123 | Superadmin |

## AQI Color Bands

| AQI | Color | Category |
|-----|-------|----------|
| 0–50 | #00e400 | Good |
| 51–100 | #ffff00 | Satisfactory |
| 101–200 | #ff7e00 | Moderate |
| 201–300 | #ff0000 | Poor |
| 301–400 | #8f3f97 | Very Poor |
| 401+ | #7e0023 | Severe |
