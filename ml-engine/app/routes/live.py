"""
Live OpenAQ station readings endpoint.
GET /api/station-readings  — returns all 40 Delhi CPCB stations with
  live PM2.5, PM10, NO2, CO, O3, SO2 and CPCB-formula AQI.
Cached 15 minutes to avoid hammering the OpenAQ API.
"""
from fastapi import APIRouter
from datetime import datetime
from app.data.openaq_loader import get_all_delhi_readings

router = APIRouter()

_cache: list = []
_cache_ts: datetime = None
_CACHE_TTL = 900  # 15 min


@router.get("/api/station-readings")
def station_readings():
    global _cache, _cache_ts
    now = datetime.now()
    if _cache_ts and (now - _cache_ts).seconds < _CACHE_TTL and _cache:
        return {"stations": _cache, "count": len(_cache), "cached": True,
                "last_updated": _cache_ts.isoformat()}

    data = get_all_delhi_readings()
    _cache = data
    _cache_ts = now
    live = sum(1 for s in data if s["source"] == "live")
    return {
        "stations":     data,
        "count":        len(data),
        "live_count":   live,
        "mock_count":   len(data) - live,
        "cached":       False,
        "last_updated": now.isoformat(),
    }
