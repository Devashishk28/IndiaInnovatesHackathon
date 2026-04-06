"""
OpenAQ v3 live loader for Delhi NCR.

Strategy:
  - 3 overlapping 25km-radius queries cover all of Delhi
  - /v3/locations/{id}/latest gives per-station pollutant readings
  - CPCB AQI formula (from test_local.py) converts PM2.5 + PM10 -> AQI
  - Mock fallback per station if API has no data
"""

import os
import time
import requests
from dotenv import load_dotenv
from app.data.stations import DELHI_STATIONS

load_dotenv()
OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")
BASE_URL = "https://api.openaq.org/v3"

# 3 centres cover all of Delhi within 25 km each
DELHI_CENTRES = [
    (28.6139, 77.2090),  # Central
    (28.7500, 77.1200),  # North
    (28.5300, 77.2700),  # South-East
]

PARAM_MAP = {
    "pm25": "pm25", "pm2.5": "pm25",
    "pm10": "pm10",
    "no2":  "no2",
    "co":   "co",
    "o3":   "o3",
    "so2":  "so2",
    "temperature":      "temperature",
    "relativehumidity": "relativehumidity",
}


# ── CPCB AQI formula (exact from test_local.py) ────────────────────

def _get_sub_aqi(val, breakpoints):
    for bp in breakpoints:
        if bp[0] <= val <= bp[1]:
            return ((bp[3] - bp[2]) / (bp[1] - bp[0])) * (val - bp[0]) + bp[2]
    return 500  # beyond severe

PM25_BP = [
    (0,   30,   0,  50), (31,  60,  51, 100),
    (61,  90, 101, 200), (91, 120, 201, 300),
    (121, 250, 301, 400), (251, 1000, 401, 500),
]
PM10_BP = [
    (0,   50,   0,  50), (51,  100,  51, 100),
    (101, 250, 101, 200), (251, 350, 201, 300),
    (351, 430, 301, 400), (431, 2000, 401, 500),
]

def calculate_cpcb_aqi(pm25: float, pm10: float) -> float:
    """
    Official Indian CPCB AQI.
    Final AQI = max of all sub-indices (PM2.5 and PM10).
    Matches the formula in test_local.py exactly.
    """
    aqi_pm25 = _get_sub_aqi(max(pm25, 0), PM25_BP)
    aqi_pm10 = _get_sub_aqi(max(pm10, 0), PM10_BP)
    return round(max(aqi_pm25, aqi_pm10), 1)


# ── HTTP helper ────────────────────────────────────────────────────

def _get(path, params=None, retries=2):
    url = BASE_URL + path
    hdrs = {"X-API-Key": OPENAQ_API_KEY, "Accept": "application/json"}
    for _ in range(retries):
        try:
            r = requests.get(url, headers=hdrs, params=params, timeout=12)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 429:
                time.sleep(3)
                continue
            print(f"[OpenAQ] HTTP {r.status_code} {path}")
            return None
        except Exception as e:
            print(f"[OpenAQ] Error: {str(e)[:80]}")
    return None


# ── Step 1: Discover all Delhi stations ───────────────────────────

def _fetch_delhi_locations():
    """
    Hit 3 overlapping 25km-radius circles to cover all of Delhi.
    Returns dict: { openaq_id: location_obj }
    Each location_obj has an extra '_sensor_map': { sensorId -> param_key }
    built from the 'sensors' array returned by the API.
    """
    found = {}
    for lat, lng in DELHI_CENTRES:
        data = _get("/locations", params={
            "coordinates": f"{lat},{lng}",
            "radius":      25000,
            "limit":       200,
        })
        if not data:
            continue
        for loc in data.get("results", []):
            # keep only India stations
            if loc.get("country", {}).get("code") == "IN":
                # Build sensorId -> canonical param key from the sensors list
                sensor_map = {}
                for s in loc.get("sensors", []):
                    param = s.get("parameter") or {}
                    raw = param.get("name", "").lower().replace(".", "").replace(" ", "")
                    if raw in PARAM_MAP:
                        sensor_map[s["id"]] = PARAM_MAP[raw]
                loc["_sensor_map"] = sensor_map
                found[loc["id"]] = loc
    print(f"[OpenAQ] Found {len(found)} India stations in Delhi region")
    return found


# ── Step 2: Latest readings for one station ────────────────────────

def _fetch_latest(location_id, sensor_map):
    """
    GET /v3/locations/{id}/latest
    In OpenAQ v3 the results contain 'sensorsId' (not a parameter object).
    We resolve sensorsId -> param_key using the sensor_map built during discovery.
    Returns flat dict: { param_key: value }
    """
    data = _get(f"/locations/{location_id}/latest")
    if not data:
        return {}

    out = {}
    for r in data.get("results", []):
        sid   = r.get("sensorsId")
        value = r.get("value")
        key   = sensor_map.get(sid)
        if key and value is not None:
            try:
                fval = float(value)
            except (TypeError, ValueError):
                continue
            if fval >= 0 and key not in out:
                out[key] = round(fval, 3)
    return out


# ── Name matching ──────────────────────────────────────────────────

def _matches(our_name, remote_name):
    a = our_name.lower()
    b = remote_name.lower()
    # direct substring
    if a in b or b in a:
        return True
    # any significant word match (>3 chars)
    for word in a.split():
        if len(word) > 3 and word in b:
            return True
    return False


# ── Mock fallback ──────────────────────────────────────────────────

def _mock_readings():
    import random
    zone_base = {
        "East": 150, "Central": 130, "West": 140,
        "North": 145, "North-West": 150, "Far North": 160,
        "South": 110, "South-West": 105, "South-East": 120,
        "North-East": 148,
    }
    results = []
    for s in DELHI_STATIONS:
        base = zone_base.get(s["zone"], 130) * random.uniform(0.9, 1.1)
        pm25 = round(base * 0.40, 1)
        pm10 = round(base * 0.65, 1)
        aqi  = calculate_cpcb_aqi(pm25, pm10)
        results.append({
            "station_id": s["id"], "station_name": s["name"],
            "lat": s["lat"], "lng": s["lng"], "zone": s["zone"],
            "aqi": aqi, "pm25": pm25, "pm10": pm10,
            "no2":  round(base * 0.17, 1),
            "co":   round(base * 0.004, 3),
            "o3":   round(30 + base * 0.05, 1),
            "so2":  round(8 + base * 0.06, 1),
            "temperature": 25.0, "relativehumidity": 55.0,
            "source": "mock",
        })
    return results


# ── Public API ─────────────────────────────────────────────────────

def get_all_delhi_readings():
    """
    Returns list of dicts — one per station — with:
      station_id, station_name, lat, lng, zone,
      pm25, pm10, no2, co, o3, so2,
      temperature, relativehumidity,
      aqi  (CPCB formula from test_local.py),
      source ('live' | 'mock')
    """
    if not OPENAQ_API_KEY:
        print("[OpenAQ] No API key — using mock data")
        return _mock_readings()

    # Discover real stations
    aq_locs   = _fetch_delhi_locations()
    mock_map  = {m["station_id"]: m for m in _mock_readings()}

    results    = []
    live_count = 0

    for station in DELHI_STATIONS:
        pollutants = {}
        matched_id = None

        # Match by name
        for loc_id, loc in aq_locs.items():
            if _matches(station["name"], loc.get("name", "")):
                matched_id = loc_id
                break

        # Fetch latest readings
        if matched_id:
            sensor_map = aq_locs[matched_id].get("_sensor_map", {})
            pollutants = _fetch_latest(matched_id, sensor_map)
            time.sleep(0.05)   # gentle rate limit

        pm25 = pollutants.get("pm25", 0.0)
        pm10 = pollutants.get("pm10", 0.0)
        fb   = mock_map[station["id"]]

        if pm25 > 0 or pm10 > 0:
            # Use CPCB formula — same as test_local.py
            aqi    = calculate_cpcb_aqi(pm25 or 1, pm10 or 1)
            source = "live"
            live_count += 1
        else:
            pm25, pm10 = fb["pm25"], fb["pm10"]
            pollutants = {k: fb[k] for k in ["pm25","pm10","no2","co","o3","so2"]}
            aqi    = fb["aqi"]
            source = "mock"

        results.append({
            "station_id":       station["id"],
            "station_name":     station["name"],
            "lat":              station["lat"],
            "lng":              station["lng"],
            "zone":             station["zone"],
            "aqi":              aqi,
            "pm25":             pollutants.get("pm25", pm25),
            "pm10":             pollutants.get("pm10", pm10),
            "no2":              pollutants.get("no2",  fb["no2"]),
            "co":               pollutants.get("co",   fb["co"]),
            "o3":               pollutants.get("o3",   fb["o3"]),
            "so2":              pollutants.get("so2",  fb["so2"]),
            "temperature":      pollutants.get("temperature",      fb["temperature"]),
            "relativehumidity": pollutants.get("relativehumidity", fb["relativehumidity"]),
            "source":           source,
        })

    print(f"[OpenAQ] Live: {live_count}/{len(DELHI_STATIONS)} | Mock: {len(DELHI_STATIONS)-live_count}/{len(DELHI_STATIONS)}")
    return results


# ── Quick test ─────────────────────────────────────────────────────
if __name__ == "__main__":
    readings = get_all_delhi_readings()
    print(f"\nTotal: {len(readings)} stations\n")
    print(f"{'Station':<26} {'AQI':>5} {'PM2.5':>6} {'PM10':>6} {'NO2':>5} {'CO':>6} {'O3':>5} {'SO2':>5}  Src")
    print("-" * 85)
    for r in readings:
        print(
            f"{r['station_name']:<26} {r['aqi']:>5} {r['pm25']:>6.1f} {r['pm10']:>6.1f}"
            f" {r['no2']:>5.1f} {r['co']:>6.3f} {r['o3']:>5.1f} {r['so2']:>5.1f}  [{r['source']}]"
        )
