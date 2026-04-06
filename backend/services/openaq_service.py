"""
OpenAQ data bridge for the backend.
Calls the ml-engine /api/station-readings endpoint (which uses OpenAQ v3)
to get live pollutant data for all 40 real CPCB stations.
Falls back to an empty dict so wards.py can use WAQI mock.
"""
import httpx
from typing import Dict

ML_ENGINE_URL = "http://localhost:8001"
_timeout = 5.0


async def fetch_all_station_readings() -> Dict[str, dict]:
    """
    Returns { station_name_lower: {pm25, pm10, no2, co, o3, so2, aqi, source} }
    or empty dict on failure.
    """
    try:
        async with httpx.AsyncClient(timeout=_timeout) as client:
            resp = await client.get(f"{ML_ENGINE_URL}/api/station-readings")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    s["station_name"].lower(): s
                    for s in data.get("stations", [])
                }
    except Exception as e:
        print(f"[openaq_service] ml-engine unreachable: {e}")
    return {}
