"""
ML prediction endpoints — source detection + 24h AQI forecast.
"""
import numpy as np
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

# Model handles loaded by main.py lifespan and stored here
_models: dict = {}

SOURCE_LABELS = {0: "Biomass", 1: "Industrial", 2: "Construction", 3: "Vehicular", 4: "Mixed"}
SOURCE_ICONS  = {"Biomass": "🔥", "Industrial": "🏭", "Construction": "🏗️", "Vehicular": "🚗", "Mixed": "🌫️"}

CLASSIFIER_FEATURES = [
    "pm25", "pm10", "no2", "co", "o3", "so2",
    "temperature", "humidity", "wind_speed",
    "hour_of_day", "day_of_week", "month",
    "pm25_pm10_ratio", "no2_co_ratio"
]


def set_models(models: dict):
    _models.update(models)


# ── Schemas ────────────────────────────────────────────────────────

class SourceInput(BaseModel):
    pm25:        float
    pm10:        float
    no2:         float
    co:          float
    o3:          float = 30.0
    so2:         float = 10.0
    temperature: float = 25.0
    humidity:    float = 55.0
    wind_speed:  float = 5.0


class ForecastInput(BaseModel):
    ward_id: Optional[int] = None
    history: Optional[List[float]] = None   # last 24h AQI values
    temperature: float = 25.0
    humidity:    float = 55.0
    wind_speed:  float = 5.0
    pm25:        float = 100.0
    pm10:        float = 150.0
    no2:         float = 70.0
    blh:         float = 800.0              # boundary layer height


# ── Source Detection ───────────────────────────────────────────────

@router.post("/api/predict/source")
async def predict_source(inp: SourceInput):
    handle = _models.get("source_detector")

    pm25_pm10_ratio = inp.pm25 / max(inp.pm10, 1)
    no2_co_ratio    = inp.no2  / max(inp.co,   0.01)
    hour = datetime.now().hour
    dow  = datetime.now().weekday()
    month = datetime.now().month

    feat_vec = np.array([[
        inp.pm25, inp.pm10, inp.no2, inp.co, inp.o3, inp.so2,
        inp.temperature, inp.humidity, inp.wind_speed,
        hour, dow, month,
        pm25_pm10_ratio, no2_co_ratio
    ]])

    if handle:
        clf = handle["model"]
        proba = clf.predict_proba(feat_vec)[0]
        pred_idx = int(np.argmax(proba))
        confidence = float(proba[pred_idx])
        breakdown = {SOURCE_LABELS[i]: round(float(p) * 100, 1) for i, p in enumerate(proba)}
    else:
        # Rule-based fallback
        if hour in {8, 9, 10, 17, 18, 19, 20} and inp.no2 > 25:
            pred_idx, confidence = 3, 0.70
        elif inp.pm25 > 150 and inp.co > 2.0:
            pred_idx, confidence = 0, 0.65
        elif inp.so2 > 30:
            pred_idx, confidence = 1, 0.62
        elif pm25_pm10_ratio > 2.5 and inp.pm10 > 100:
            pred_idx, confidence = 2, 0.60
        else:
            pred_idx, confidence = 4, 0.50
        remaining = (1.0 - confidence) / 4
        breakdown = {SOURCE_LABELS[i]: round((confidence if i == pred_idx else remaining) * 100, 1) for i in range(5)}

    source = SOURCE_LABELS[pred_idx]
    return {
        "source":     source,
        "icon":       SOURCE_ICONS[source],
        "confidence": round(confidence, 3),
        "breakdown":  breakdown,
        "model_used": "ml" if handle else "rules",
    }


# ── 24h AQI Forecast ──────────────────────────────────────────────

@router.post("/api/predict/aqi")
async def predict_aqi(inp: ForecastInput):
    handle = _models.get("aqi_forecaster")
    now = datetime.now()
    hour  = now.hour
    month = now.month

    # Build history (use provided or synthetic)
    if inp.history and len(inp.history) >= 24:
        history24 = list(inp.history[:24])
    elif inp.history:
        # Pad with slight variation
        h = list(inp.history)
        while len(h) < 24:
            h.insert(0, max(60, h[0] + np.random.normal(0, 10)))
        history24 = h[:24]
    else:
        # Synthetic from ward lookup
        base = 200.0
        history24 = [max(60, base + np.random.normal(0, 15)) for _ in range(24)]

    feat_vec = np.array([history24 + [
        inp.pm25, inp.pm10, inp.no2,
        inp.temperature, inp.humidity, inp.wind_speed,
        inp.blh, hour, month
    ]])

    forecast = []
    if handle:
        scaler  = handle["scaler"]
        models  = handle["models"]
        X_scaled = scaler.transform(feat_vec)
        for h in range(24):
            pred  = float(models[h].predict(X_scaled)[0])
            pred  = max(60, pred)
            margin = pred * 0.12
            ts = now + timedelta(hours=h+1)
            forecast.append({
                "hour":          ts.strftime("%H:%M"),
                "timestamp":     ts.isoformat(),
                "predicted_aqi": round(pred),
                "lower_bound":   round(max(50, pred - margin)),
                "upper_bound":   round(pred + margin),
                "category":      _aqi_category(round(pred)),
            })
    else:
        # Simple trend extrapolation fallback
        last = history24[-1]
        for h in range(24):
            diurnal = 1.15 if (hour + h) % 24 in {8, 9, 10, 17, 18, 19} else 1.0
            val = max(60, last + np.random.normal(0, 12) * diurnal)
            margin = val * 0.12
            ts = now + timedelta(hours=h+1)
            forecast.append({
                "hour":          ts.strftime("%H:%M"),
                "timestamp":     ts.isoformat(),
                "predicted_aqi": round(val),
                "lower_bound":   round(max(50, val - margin)),
                "upper_bound":   round(val + margin),
                "category":      _aqi_category(round(val)),
            })
            last = val

    avg_forecast = sum(f["predicted_aqi"] for f in forecast) / len(forecast)
    trend = "rising" if avg_forecast > history24[-1] + 15 else "falling" if avg_forecast < history24[-1] - 15 else "stable"

    return {
        "ward_id":  inp.ward_id,
        "forecast": forecast,
        "trend":    trend,
        "model_used": "ml" if handle else "extrapolation",
    }


def _aqi_category(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Satisfactory"
    if aqi <= 200:  return "Moderate"
    if aqi <= 300:  return "Poor"
    if aqi <= 400:  return "Very Poor"
    return "Severe"
