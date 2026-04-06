"""
Admin endpoints — JWT protected.
"""
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from routers.auth import require_admin, require_superadmin

router = APIRouter()

_DB = None   # set by main.py


def set_db(db):
    global _DB
    _DB = db


def _policy_for_source(source: str, aqi: int) -> dict:
    priority = "ADVISORY"
    actions  = []
    if source == "Vehicular" and aqi > 300:
        priority = "CRITICAL"
        actions  = ["Implement odd-even vehicular scheme", "Deploy traffic police at hotspots", "Issue public transport advisory"]
    elif source == "Biomass" and aqi > 200:
        priority = "HIGH"
        actions  = ["Deploy field teams to stop open burning", "Issue fines under Air Act", "Alert fire stations"]
    elif source == "Industrial" and aqi > 300:
        priority = "CRITICAL"
        actions  = ["Immediate shutdown of non-essential industries", "CPCB inspection teams deployed", "Alert district magistrate"]
    elif source == "Construction" and aqi > 200:
        priority = "WARNING"
        actions  = ["Inspect construction sites within 5km", "Enforce dust suppression norms", "Issue stop-work notice if non-compliant"]
    else:
        priority = "ADVISORY"
        actions  = ["Monitor situation", "Issue public health advisory", "Increase road sweeping frequency"]
    return {"priority": priority, "actions": actions}


@router.get("/api/admin/wards")
async def admin_wards(token: dict = Depends(require_admin)):
    from routers.wards import get_ward_data
    wards = await get_ward_data()
    return {"wards": sorted(wards, key=lambda w: -w["aqi"]), "count": len(wards)}


@router.get("/api/admin/logs")
async def admin_logs(token: dict = Depends(require_admin)):
    logs = []
    if _DB:
        try:
            cursor = _DB["activity_logs"].find({}, {"_id": 0}).sort("ts", -1).limit(100)
            logs = list(cursor)
        except Exception:
            pass

    if not logs:
        # Synthetic log for demo
        now = datetime.now()
        sample_events = [
            "AQI spike detected at Anand Vihar (AQI: 412)",
            "GRAP Stage II triggered automatically",
            "Community report verified at Wazirpur",
            "ML model retrain scheduled",
            "Admin login: admin@delhi.gov.in",
            "Policy recommendation generated",
            "Alert banner updated for 47 wards",
        ]
        logs = [
            {"event": e, "ts": (now - timedelta(minutes=i * 12)).isoformat(), "level": "INFO"}
            for i, e in enumerate(sample_events)
        ]
    return {"logs": logs, "count": len(logs)}


@router.post("/api/admin/policy")
async def generate_policy(token: dict = Depends(require_admin)):
    from routers.wards import get_ward_data
    wards  = await get_ward_data()
    sorted_wards = sorted(wards, key=lambda w: -w["aqi"])[:10]

    recommendations = []
    for ward in sorted_wards:
        pol = _policy_for_source(ward.get("source", "Mixed"), ward["aqi"])
        recommendations.append({
            "ward_id":   ward["ward_id"],
            "ward_name": ward["ward_name"],
            "aqi":       ward["aqi"],
            "source":    ward.get("source", "Mixed"),
            "priority":  pol["priority"],
            "actions":   pol["actions"],
            "district":  ward["district"],
        })

    return {
        "generated_at":    datetime.now().isoformat(),
        "recommendations": recommendations,
        "by":              token["sub"],
    }
