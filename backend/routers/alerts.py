"""
GRAP alert system — auto-computed from average AQI.
"""
from datetime import datetime
from fastapi import APIRouter

router = APIRouter()


def _grap_from_avg(avg: int) -> dict:
    if avg <= 200:
        return {
            "stage": 0, "label": "No GRAP Action",
            "color": "#22c55e", "bg": "green",
            "message": "Air quality is acceptable. No restrictions in effect.",
            "actions": []
        }
    if avg <= 300:
        return {
            "stage": 1, "label": "GRAP Stage I — Poor",
            "color": "#f97316", "bg": "orange",
            "message": "Restrict use of coal and wood in tandoors. Mechanized sweeping of roads.",
            "actions": [
                "Mechanised sweeping of all roads",
                "Water sprinkling on dusty surfaces",
                "Strict action on open burning",
                "Use of CNG/electric vehicles encouraged"
            ]
        }
    if avg <= 400:
        return {
            "stage": 2, "label": "GRAP Stage II — Very Poor",
            "color": "#ef4444", "bg": "red",
            "message": "Close brick kilns, hot mix plants. Enhanced sweeping & sprinkling.",
            "actions": [
                "Closure of brick kilns",
                "Closure of stone crushers",
                "Ban on diesel generators (except emergencies)",
                "Enhanced public transport frequency",
                "Citizens advised to avoid outdoor activities"
            ]
        }
    if avg <= 450:
        return {
            "stage": 3, "label": "GRAP Stage III — Severe",
            "color": "#7f1d1d", "bg": "darkred",
            "message": "BS III petrol & BS IV diesel vehicles banned. Schools may close.",
            "actions": [
                "BS III petrol & BS IV diesel 4-wheelers banned",
                "50% staff work-from-home in non-essential sectors",
                "Schools shift to online mode for classes 1–5",
                "Construction activities halted (except emergencies)",
                "Entry of trucks banned in Delhi (except essentials)"
            ]
        }
    return {
        "stage": 4, "label": "GRAP Stage IV — Severe+",
        "color": "#000000", "bg": "black",
        "message": "EMERGENCY: Odd-even vehicular scheme. All schools closed.",
        "actions": [
            "Odd-even vehicular scheme enforced",
            "All schools and colleges closed",
            "50%+ staff working from home mandated",
            "All construction and demolition stopped",
            "Emergency health advisory issued",
            "Anti-smog guns deployed across hotspots"
        ]
    }


@router.get("/api/alerts")
async def get_alerts():
    # Import here to avoid circular
    from routers.wards import get_ward_data
    wards = await get_ward_data()
    aqis  = [w["aqi"] for w in wards]
    avg   = round(sum(aqis) / len(aqis))

    grap = _grap_from_avg(avg)

    affected = sorted(
        [{"ward_id": w["ward_id"], "ward_name": w["ward_name"],
          "aqi": w["aqi"], "district": w["district"]}
         for w in wards if w["aqi"] > 200],
        key=lambda x: -x["aqi"]
    )[:20]

    return {
        **grap,
        "avg_aqi":        avg,
        "affected_wards": affected,
        "affected_count": len([w for w in wards if w["aqi"] > 200]),
        "timestamp":      datetime.now().isoformat(),
    }
