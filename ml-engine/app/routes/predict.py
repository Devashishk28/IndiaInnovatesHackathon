from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.models import aqi_forecaster, anomaly_detector

router = APIRouter()

class AQIPredictRequest(BaseModel):
    aqi_history: List[float]
    temperature: float
    relativehumidity: float
    co: float
    no2: float
    pm25: float
    pm10: float
    hour: int
    month: int

class AnomalyRequest(BaseModel):
    pm25: float
    pm10: float
    no2: float
    co: float
    o3: float
    so2: float
    aqi: float
    prev_aqi: Optional[float] = None

@router.post("/predict-aqi")
def predict_aqi_route(req: AQIPredictRequest):
    if len(req.aqi_history) != 7:
        raise HTTPException(status_code=400, detail="aqi_history must contain exactly 7 values.")
        
    try:
        result = aqi_forecaster.predict_aqi(
            aqi_history=req.aqi_history, temperature=req.temperature,
            relativehumidity=req.relativehumidity, co=req.co,
            no2=req.no2, pm25=req.pm25, pm10=req.pm10,
            hour=req.hour, month=req.month
        )
        
        forecast = result["forecast"]
        last_known = req.aqi_history[-1]
        avg_forecast = sum(forecast) / len(forecast)
        
        if avg_forecast > last_known + 15:
            trend = "Rising"
        elif avg_forecast < last_known - 15:
            trend = "Falling"
        else:
            trend = "Stable"
            
        max_f = max(forecast)
        if max_f >= 450: grap_warning = "GRAP Stage IV expected"
        elif max_f >= 400: grap_warning = "GRAP Stage III expected"
        elif max_f >= 300: grap_warning = "GRAP Stage II expected"
        elif max_f >= 200: grap_warning = "GRAP Stage I expected"
        else: grap_warning = "No GRAP warning"
        
        return {
            "forecast": forecast,
            "hours_ahead": result["hours_ahead"],
            "input_history": result["input_history"],
            "trend": trend,
            "max_forecast": max_f,
            "min_forecast": min(forecast),
            "grap_warning": grap_warning
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-anomaly")
def detect_anomaly_route(req: AnomalyRequest):
    try:
        return anomaly_detector.detect(
            pm25=req.pm25, pm10=req.pm10, no2=req.no2, co=req.co,
            o3=req.o3, so2=req.so2, aqi=req.aqi, prev_aqi=req.prev_aqi
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))