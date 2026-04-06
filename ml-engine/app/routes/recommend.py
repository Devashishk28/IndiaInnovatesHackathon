from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class RecommendRequest(BaseModel):
    ward_id: int
    ward_name: str
    aqi: float
    source: str
    confidence: float

@router.post("/recommend")
def recommend_actions(req: RecommendRequest):
    aqi = req.aqi
    
    if aqi <= 200:
        stage, label, color = 0, "Below GRAP", "Green"
        advisory = "Air quality acceptable. No precautions needed."
    elif aqi <= 300:
        stage, label, color = 1, "GRAP Stage I — Poor", "Yellow"
        advisory = "Air quality is Poor. Sensitive groups reduce outdoor activity."
    elif aqi <= 400:
        stage, label, color = 2, "GRAP Stage II — Very Poor", "Orange"
        advisory = "Air quality is Very Poor. Avoid outdoor activity. Wear N95 mask. Close windows 6-10AM and 6-9PM."
    elif aqi <= 450:
        stage, label, color = 3, "GRAP Stage III — Severe", "Red"
        advisory = "Air quality is Severe. Avoid all outdoor activity. N95 mandatory. Use air purifiers."
    else:
        stage, label, color = 4, "GRAP Stage IV — Severe+", "Maroon"
        advisory = "Air quality is Severe+. STAY INDOORS. N95 mandatory. Call health helpline 104."

    actions = []
    
    if stage >= 1:
        actions.extend([
            {"priority": "HIGH", "action": "Deploy mechanical sweepers on major roads.", "department": "MCD/PWD", "estimated_impact": "PM10 -15%", "timeframe": "24hr"},
            {"priority": "HIGH", "action": "Enforce dust suppression at construction sites.", "department": "MCD", "estimated_impact": "PM2.5 -10%", "timeframe": "Immediate"},
            {"priority": "HIGH", "action": "Ban open burning of waste/biomass.", "department": "Police/MCD", "estimated_impact": "PM2.5 -20%", "timeframe": "Immediate"}
        ])
    if stage >= 2:
        actions.extend([
            {"priority": "CRITICAL", "action": "Restrict diesel generators.", "department": "DERC", "estimated_impact": "NO2 -12%", "timeframe": "24hr"},
            {"priority": "CRITICAL", "action": "Halt hot mix plants.", "department": "DPCC", "estimated_impact": "PM10 -18%", "timeframe": "Immediate"}
        ])
    if stage >= 3:
        actions.extend([
            {"priority": "CRITICAL", "action": "Restrict BS-III petrol / BS-IV diesel vehicles.", "department": "Traffic Police", "estimated_impact": "PM2.5 -12%", "timeframe": "Immediate"},
            {"priority": "CRITICAL", "action": "Primary schools switch to hybrid mode.", "department": "Education Dept", "estimated_impact": "Child exposure reduced", "timeframe": "Next day"}
        ])
    if stage >= 4:
        actions.extend([
            {"priority": "CRITICAL", "action": "BAN all truck entry except essential goods.", "department": "Police", "estimated_impact": "PM10/2.5 -20%", "timeframe": "Immediate"},
            {"priority": "CRITICAL", "action": "HALT all construction.", "department": "PWD/MCD", "estimated_impact": "PM10 -25%", "timeframe": "Immediate"}
        ])

    # Add source-specific actions if confident
    if req.confidence >= 60.0:
        if req.source == "Biomass":
            actions.append({"priority": "CRITICAL", "action": "Deploy field teams to stop crop burning.", "department": "Agriculture", "estimated_impact": "PM2.5 -25%", "timeframe": "2hr"})
        elif req.source == "Industrial":
            actions.append({"priority": "CRITICAL", "action": "Issue notice to reduce emissions 50%.", "department": "DPCC", "estimated_impact": "SO2/NO2 -20%", "timeframe": "24hr"})
        elif req.source == "Construction":
            actions.append({"priority": "HIGH", "action": "Mandatory water sprinkling every 2hrs.", "department": "MCD", "estimated_impact": "PM10 -20%", "timeframe": "Immediate"})

    return {
        "ward_id": req.ward_id,
        "ward_name": req.ward_name,
        "aqi": aqi,
        "grap_stage": stage,
        "grap_label": label,
        "alert_level": color,
        "citizen_advisory": advisory,
        "actions": actions
    }