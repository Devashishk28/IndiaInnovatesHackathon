"""
Community reports, crowd-sourced AQI observations, and blind spot analysis.
"""
import math
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
_DB = None

# In-memory store for crowd-sourced readings (max 500 entries, rolling)
_CROWD_STORE: list = []
_MAX_CROWD = 500


def set_db(db):
    global _DB
    _DB = db


# ── Models ──────────────────────────────────────────────────────────

class ReportInput(BaseModel):
    ward_id:        int
    ward_name:      str
    lat:            float
    lng:            float
    description:    str
    source_type:    str = "Unknown"
    reporter_name:  Optional[str] = "Anonymous"
    photo_url:      Optional[str] = None


class CrowdObservation(BaseModel):
    lat:         float
    lng:         float
    # What the observer reports
    visual:      str           # "Heavy Smoke", "Dust Haze", "Vehicle Exhaust", "Industrial Fumes", "Clear", "Mild Haze"
    severity:    int           # 1 (mild) – 5 (very bad)
    note:        Optional[str] = ""
    reporter:    Optional[str] = "Anonymous"


# ── Helpers ─────────────────────────────────────────────────────────

def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def _severity_to_aqi_est(severity: int, visual: str) -> int:
    """Convert crowd severity + visual cue to rough AQI estimate."""
    base = {1: 80, 2: 130, 3: 180, 4: 260, 5: 350}.get(severity, 130)
    if visual in {"Heavy Smoke", "Industrial Fumes"}:
        base = int(base * 1.15)
    elif visual == "Clear":
        base = min(base, 80)
    return base


# ── Community Reports ────────────────────────────────────────────────

@router.post("/api/reports")
async def submit_report(inp: ReportInput):
    from routers.wards import get_ward_data
    wards = await get_ward_data()

    verified = False
    status   = "Pending Review"
    for w in wards:
        dist = _haversine_km(inp.lat, inp.lng, w["lat"], w["lng"])
        if dist <= 2.0 and w["aqi"] > 200:
            verified = True
            status   = "Sensor Confirmed"
            break

    report = {
        "id":          datetime.now().strftime("%Y%m%d%H%M%S") + str(inp.ward_id),
        "ward_id":     inp.ward_id,
        "ward_name":   inp.ward_name,
        "lat":         inp.lat,
        "lng":         inp.lng,
        "description": inp.description,
        "source_type": inp.source_type,
        "reporter":    inp.reporter_name,
        "photo_url":   inp.photo_url,
        "verified":    verified,
        "status":      status,
        "created_at":  datetime.now().isoformat(),
    }

    if _DB:
        try:
            _DB["community_reports"].insert_one({**report})
        except Exception:
            pass

    return {"success": True, "report": report}


@router.get("/api/reports")
async def get_reports():
    reports = []
    if _DB:
        try:
            cursor = _DB["community_reports"].find(
                {"status": {"$in": ["Sensor Confirmed", "Approved"]}},
                {"_id": 0}
            ).sort("created_at", -1).limit(50)
            reports = list(cursor)
        except Exception:
            pass

    if not reports:
        reports = [
            {
                "id": "demo1", "ward_name": "Anand Vihar",
                "description": "Heavy smoke from burning garbage near bus stop",
                "source_type": "Biomass", "verified": True,
                "status": "Sensor Confirmed",
                "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
            },
            {
                "id": "demo2", "ward_name": "Wazirpur",
                "description": "Industrial emissions visible from factory chimneys",
                "source_type": "Industrial", "verified": True,
                "status": "Sensor Confirmed",
                "created_at": (datetime.now() - timedelta(hours=5)).isoformat(),
            },
        ]
    return {"reports": reports, "count": len(reports)}


# ── Crowd-sourced AQI Observations ──────────────────────────────────

@router.post("/api/crowdsource")
async def submit_crowd(obs: CrowdObservation):
    global _CROWD_STORE
    aqi_est = _severity_to_aqi_est(obs.severity, obs.visual)

    entry = {
        "id":         str(uuid.uuid4())[:8],
        "lat":        obs.lat,
        "lng":        obs.lng,
        "visual":     obs.visual,
        "severity":   obs.severity,
        "aqi_est":    aqi_est,
        "note":       obs.note or "",
        "reporter":   obs.reporter or "Anonymous",
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=6)).isoformat(),
    }

    _CROWD_STORE.append(entry)
    # Rolling window — keep newest _MAX_CROWD
    if len(_CROWD_STORE) > _MAX_CROWD:
        _CROWD_STORE = _CROWD_STORE[-_MAX_CROWD:]

    return {"success": True, "id": entry["id"], "aqi_est": aqi_est}


@router.get("/api/crowdsource")
async def get_crowd():
    cutoff = datetime.now() - timedelta(hours=6)
    active = [r for r in _CROWD_STORE
              if datetime.fromisoformat(r["created_at"]) >= cutoff]

    # Seed with realistic demo data if empty
    if not active:
        now = datetime.now()
        active = [
            {"id": "s1", "lat": 28.6469, "lng": 77.3152, "visual": "Vehicle Exhaust",
             "severity": 3, "aqi_est": 160, "note": "Traffic jam near flyover",
             "reporter": "Rahul K", "created_at": (now - timedelta(minutes=25)).isoformat()},
            {"id": "s2", "lat": 28.7000, "lng": 77.1700, "visual": "Industrial Fumes",
             "severity": 4, "aqi_est": 255, "note": "Factory smoke near Wazirpur",
             "reporter": "Priya S", "created_at": (now - timedelta(minutes=55)).isoformat()},
            {"id": "s3", "lat": 28.6289, "lng": 77.2465, "visual": "Dust Haze",
             "severity": 2, "aqi_est": 130, "note": "Construction dust on Ring Road",
             "reporter": "Amit T", "created_at": (now - timedelta(hours=1, minutes=10)).isoformat()},
            {"id": "s4", "lat": 28.5934, "lng": 77.2196, "visual": "Mild Haze",
             "severity": 2, "aqi_est": 118, "note": "",
             "reporter": "Anonymous", "created_at": (now - timedelta(hours=2)).isoformat()},
            {"id": "s5", "lat": 28.7900, "lng": 77.0300, "visual": "Heavy Smoke",
             "severity": 4, "aqi_est": 280, "note": "Open burning near industrial area",
             "reporter": "Neha M", "created_at": (now - timedelta(hours=3)).isoformat()},
        ]

    return {"readings": active, "count": len(active)}


# ── Blind Spot Analysis ──────────────────────────────────────────────

@router.get("/api/blindspots")
async def blindspots():
    from routers.wards import get_ward_data
    from data.delhi_wards import REAL_STATIONS

    wards = await get_ward_data()
    non_station = [w for w in wards if not w.get("is_real_station")]

    # All wards sorted by confidence (ascending = worst coverage first)
    sorted_gaps = sorted(non_station, key=lambda w: w.get("confidence", 0.5))

    # Bucket into tiers
    critical   = [w for w in sorted_gaps if w.get("confidence", 0.5) < 0.45]
    moderate   = [w for w in sorted_gaps if 0.45 <= w.get("confidence", 0.5) < 0.65]
    good_cover = [w for w in sorted_gaps if w.get("confidence", 0.5) >= 0.65]

    # District-level coverage
    dist_map: dict = {}
    for w in wards:
        d = w.get("district", "Unknown")
        if d not in dist_map:
            dist_map[d] = {"district": d, "total": 0, "real": 0, "avg_confidence": []}
        dist_map[d]["total"] += 1
        if w.get("is_real_station"):
            dist_map[d]["real"] += 1
        dist_map[d]["avg_confidence"].append(w.get("confidence", 0.95 if w.get("is_real_station") else 0.55))

    district_coverage = []
    for d, v in dist_map.items():
        avg_conf = round(sum(v["avg_confidence"]) / len(v["avg_confidence"]), 2) if v["avg_confidence"] else 0.5
        district_coverage.append({
            "district":    d,
            "total_wards": v["total"],
            "real_sensors": v["real"],
            "avg_confidence": avg_conf,
            "coverage_pct": round(v["real"] / max(v["total"], 1) * 100, 1),
        })
    district_coverage.sort(key=lambda x: x["avg_confidence"])

    # Recommended placement: centroid of 5 worst critical wards
    recommended = []
    if critical:
        # Cluster by proximity, suggest up to 3 new sensors
        clusters = []
        used = set()
        for w in critical[:20]:
            if w["ward_id"] in used:
                continue
            nearby = [c for c in critical if _haversine_km(w["lat"], w["lng"], c["lat"], c["lng"]) < 5.0]
            for c in nearby:
                used.add(c["ward_id"])
            centroid_lat = sum(c["lat"] for c in nearby) / len(nearby)
            centroid_lng = sum(c["lng"] for c in nearby) / len(nearby)
            clusters.append({
                "lat": round(centroid_lat, 4),
                "lng": round(centroid_lng, 4),
                "wards_covered": len(nearby),
                "sample_ward": w["ward_name"],
                "district": w.get("district", ""),
            })
            if len(clusters) >= 3:
                break
        recommended = clusters

    return {
        "total_wards":         272,
        "real_sensors":        20,
        "interpolated":        252,
        "coverage_percent":    round(20 / 272 * 100, 1),
        "critical_gaps":       len(critical),
        "moderate_gaps":       len(moderate),
        "well_covered":        len(good_cover),
        "top_5_gap_wards":     [
            {"ward_id": w["ward_id"], "ward_name": w["ward_name"],
             "district": w["district"], "confidence": w.get("confidence", 0.5),
             "nearest_station": w.get("nearest_station", "unknown"),
             "nearest_dist_km": w.get("nearest_dist_km", 0)}
            for w in sorted_gaps[:10]
        ],
        "all_gap_wards":       [
            {"ward_id": w["ward_id"], "ward_name": w["ward_name"],
             "district": w["district"], "confidence": round(w.get("confidence", 0.5), 2),
             "lat": w["lat"], "lng": w["lng"]}
            for w in critical
        ],
        "district_coverage":   district_coverage,
        "recommended_sensors": recommended,
    }
