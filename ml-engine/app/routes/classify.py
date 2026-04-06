from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.models import source_classifier

router = APIRouter()

class ClassifyRequest(BaseModel):
    pm25: float
    pm10: float
    no2: float
    co: float
    o3: float = 0.0
    so2: float = 0.0
    temperature: float = 25.0
    relativehumidity: float = 60.0
    hour: Optional[int] = 12
    month: Optional[int] = 1

SOURCE_META = {
    "Biomass": {"action": "Identify and stop open burning. Deploy field teams.", "icon": "🔥"},
    "Industrial": {"action": "Alert industrial units to reduce emissions. Inspect stacks.", "icon": "🏭"},
    "Construction": {"action": "Enforce dust suppression. Mandatory water sprinkling.", "icon": "🏗️"},
    "Vehicular": {"action": "Increase PUC checks. Consider odd-even if AQI>300.", "icon": "🚗"},
    "Mixed": {"action": "Multiple sources active. Cross-check with field inspection.", "icon": "🌫️"}
}

@router.post("/classify-source")
def classify_source_route(req: ClassifyRequest):
    result = source_classifier.predict(
        pm25=req.pm25, pm10=req.pm10, no2=req.no2, co=req.co,
        o3=req.o3, so2=req.so2, temperature=req.temperature,
        relativehumidity=req.relativehumidity, hour=req.hour, month=req.month
    )
    
    source_name = result["source"]
    meta = SOURCE_META.get(source_name, {"action": "Monitor closely.", "icon": "❓"})
    
    result["ward_action"] = meta["action"]
    result["icon"] = meta["icon"]
    
    return result