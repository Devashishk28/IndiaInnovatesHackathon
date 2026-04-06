"""
Delhi AQI Intelligence Platform — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# ── Model loading ────────────────────────────────────────────────────
def _load_models() -> dict:
    import joblib
    models = {}
    models_dir = Path(__file__).parent / "models"

    detector_path   = models_dir / "source_detector.pkl"
    forecaster_path = models_dir / "aqi_forecaster.pkl"

    if detector_path.exists():
        models["source_detector"] = joblib.load(detector_path)
        print(f"[OK] source_detector.pkl loaded ({detector_path.stat().st_size // 1024} KB)")
    else:
        print("[WARN] source_detector.pkl not found - using rule-based fallback")

    if forecaster_path.exists():
        models["aqi_forecaster"] = joblib.load(forecaster_path)
        print(f"[OK] aqi_forecaster.pkl loaded ({forecaster_path.stat().st_size // 1024} KB)")
    else:
        print("[WARN] aqi_forecaster.pkl not found - using extrapolation fallback")

    return models


def _init_mongo():
    try:
        from pymongo import MongoClient
        uri  = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        name = os.getenv("DB_NAME",   "delhi_aqi")
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        client.server_info()
        db = client[name]
        print(f"[OK] MongoDB connected - db: {name}")
        return db
    except Exception as e:
        print(f"[WARN] MongoDB unavailable ({e}) - running without persistence")
        return None


# ── Lifespan ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    models = _load_models()
    db     = _init_mongo()

    # Push into routers
    from routers import ml as ml_router
    from routers import admin as admin_router
    from routers import reports as reports_router
    ml_router.set_models(models)
    admin_router.set_db(db)
    reports_router.set_db(db)

    print("[OK] Delhi AQI Platform ready on http://localhost:8000")
    yield
    # Shutdown (nothing to clean up)


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Delhi AQI Intelligence Platform",
    version="2.0.0",
    description="Government-grade air quality monitoring for Delhi NCR",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────
from routers import wards, ml, alerts, auth, admin, reports

app.include_router(wards.router,   tags=["Wards"])
app.include_router(ml.router,      tags=["ML"])
app.include_router(alerts.router,  tags=["Alerts"])
app.include_router(auth.router,    tags=["Auth"])
app.include_router(admin.router,   tags=["Admin"])
app.include_router(reports.router, tags=["Reports"])


@app.get("/")
async def root():
    return {
        "name":    "Delhi AQI Intelligence Platform",
        "version": "2.0.0",
        "status":  "operational",
        "docs":    "/docs",
    }


@app.get("/health")
async def health():
    from pathlib import Path
    models_dir = Path(__file__).parent / "models"
    return {
        "status":          "ok",
        "source_detector": (models_dir / "source_detector.pkl").exists(),
        "aqi_forecaster":  (models_dir / "aqi_forecaster.pkl").exists(),
    }
