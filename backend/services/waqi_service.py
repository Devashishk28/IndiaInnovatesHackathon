"""
WAQI API service using geo-based lookup (lat/lng) for all 20 real Delhi stations.
Each station is queried via https://api.waqi.info/feed/geo:{lat};{lng}/
which returns the nearest CPCB station data including all pollutants.
"""
import os
import math
import random
import httpx
from datetime import datetime

WAQI_API_KEY = os.getenv("WAQI_API_KEY", "938036e4ddc46df9d28623f116943deb84307e2e")
WAQI_BASE    = "https://api.waqi.info"

# Exact coordinates for each real CPCB station
_STATION_COORDS = {
    "Anand Vihar":  (28.6469, 77.3152),
    "Rohini":       (28.7450, 77.0540),
    "Punjabi Bagh": (28.6700, 77.1300),
    "RK Puram":     (28.5700, 77.1900),
    "Dwarka":       (28.5921, 77.0460),
    "ITO":          (28.6289, 77.2465),
    "Lodhi Road":   (28.5934, 77.2196),
    "Okhla":        (28.5355, 77.2700),
    "Wazirpur":     (28.7000, 77.1700),
    "Bawana":       (28.7900, 77.0300),
    "Narela":       (28.8560, 77.0940),
    "Vivek Vihar":  (28.6700, 77.3100),
    "Patparganj":   (28.6186, 77.2930),
    "Shahdara":     (28.6700, 77.2880),
    "Jahangirpuri": (28.7350, 77.1680),
    "DTU":          (28.7499, 77.1183),
    "IGI Airport":  (28.5562, 77.1000),
    "Mundka":       (28.6900, 77.0300),
    "Nehru Nagar":  (28.5700, 77.2500),
    "Sonia Vihar":  (28.7200, 77.2700),
}

# Realistic annual-average AQI per station (annual mean, not peak winter).
# Seasonal multiplier below scales these up/down by month.
_BASE_MOCK = {
    "Anand Vihar":  165, "Rohini":       138, "Punjabi Bagh": 122,
    "RK Puram":     108, "Dwarka":       115, "ITO":          132,
    "Lodhi Road":   100, "Okhla":        125, "Wazirpur":     145,
    "Bawana":       158, "Narela":       152, "Vivek Vihar":  140,
    "Patparganj":   130, "Shahdara":     142, "Jahangirpuri": 148,
    "DTU":          120, "IGI Airport":  98,  "Mundka":       152,
    "Nehru Nagar":  112, "Sonia Vihar":  128,
}

# ── CPCB AQI formula ────────────────────────────────────────────────

def _get_sub_aqi(val, breakpoints):
    for bp in breakpoints:
        if bp[0] <= val <= bp[1]:
            return ((bp[3] - bp[2]) / (bp[1] - bp[0])) * (val - bp[0]) + bp[2]
    return 500

PM25_BP = [
    (0, 30, 0, 50),    (31, 60, 51, 100),
    (61, 90, 101, 200), (91, 120, 201, 300),
    (121, 250, 301, 400), (251, 1000, 401, 500),
]
PM10_BP = [
    (0, 50, 0, 50),     (51, 100, 51, 100),
    (101, 250, 101, 200), (251, 350, 201, 300),
    (351, 430, 301, 400), (431, 2000, 401, 500),
]

def _cpcb_aqi(pm25: float, pm10: float) -> int:
    return round(max(_get_sub_aqi(max(pm25, 0), PM25_BP),
                     _get_sub_aqi(max(pm10, 0), PM10_BP)))


# ── Reverse US-EPA sub-index → approximate µg/m³ ────────────────────

_EPA_PM25_BP = [
    (0,   50,   0.0,  12.0),
    (51,  100,  12.1, 35.4),
    (101, 150,  35.5, 55.4),
    (151, 200,  55.5, 150.4),
    (201, 300, 150.5, 250.4),
    (301, 400, 250.5, 350.4),
    (401, 500, 350.5, 500.4),
]
_EPA_PM10_BP = [
    (0,   54,   0,   54),
    (55,  154,  55,  154),
    (155, 254, 155,  254),
    (255, 354, 255,  354),
    (355, 424, 355,  424),
    (425, 504, 425,  504),
    (505, 604, 505,  604),
]

def _reverse_epa(sub_aqi: float, breakpoints) -> float:
    """Convert a US-EPA sub-index value back to approximate raw µg/m³."""
    for bp in breakpoints:
        if bp[0] <= sub_aqi <= bp[1]:
            raw = (bp[3] - bp[2]) / (bp[1] - bp[0]) * (sub_aqi - bp[0]) + bp[2]
            return max(raw, 0.0)
    return float(sub_aqi)


def _seasonal_multiplier() -> float:
    """
    Scale factor relative to annual average.
    Based on historical Delhi AQI patterns:
    - Winter (Nov-Jan): 1.5-1.7x (smog/inversion)
    - Spring (Mar-Apr):  0.85-0.90x (improving)
    - Summer (May-Jun):  0.70-0.80x (dust storms, but dispersed)
    - Monsoon (Jul-Sep): 0.45-0.55x (rain cleans air)
    - Post-monsoon (Oct): 1.10x
    """
    month = datetime.now().month
    season_map = {
        1: 1.55, 2: 1.30, 3: 0.88, 4: 0.78,
        5: 0.72, 6: 0.70, 7: 0.48, 8: 0.45,
        9: 0.62, 10: 1.12, 11: 1.58, 12: 1.65,
    }
    return season_map.get(month, 1.0)


def _mock_for(station_name: str) -> dict:
    base = _BASE_MOCK.get(station_name, 130)
    aqi  = max(55, int(base * _seasonal_multiplier() * random.uniform(0.93, 1.07)))
    ratio = aqi / 300
    return {
        "pm25": round(aqi * 0.40, 1),
        "pm10": round(aqi * 0.58, 1),
        "no2":  round(45 + aqi * 0.18, 1),
        "co":   round(0.6 + ratio * 1.4, 2),
        "o3":   round(25 + aqi * 0.06, 1),
        "so2":  round(8  + aqi * 0.06, 1),
        "aqi":  aqi,
        "source": "mock",
    }


async def fetch_station_aqi(station_name: str) -> dict:
    """
    Fetch live data from WAQI using geo:lat;lng lookup.
    Uses WAQI's own data.aqi directly — this is the value waqi.info displays.
    iaqi.pm25/pm10 are US-EPA sub-indices; reversed to approximate raw µg/m³.
    Falls back to realistic mock on any failure.
    """
    coords = _STATION_COORDS.get(station_name)
    if coords:
        lat, lng = coords
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{WAQI_BASE}/feed/geo:{lat};{lng}/",
                    params={"token": WAQI_API_KEY},
                )
                data = resp.json()
                if data.get("status") == "ok":
                    d    = data["data"]
                    iaqi = d.get("iaqi", {})

                    aqi = int(d.get("aqi", 0))
                    if aqi > 0:
                        pm25_idx = float(iaqi.get("pm25", {}).get("v") or 0)
                        pm10_idx = float(iaqi.get("pm10", {}).get("v") or 0)
                        pm25 = _reverse_epa(pm25_idx, _EPA_PM25_BP) if pm25_idx else round(aqi * 0.40, 1)
                        pm10 = _reverse_epa(pm10_idx, _EPA_PM10_BP) if pm10_idx else round(aqi * 0.58, 1)

                        no2 = float(iaqi.get("no2", {}).get("v") or 0) or round(45 + aqi * 0.18, 1)
                        co  = float(iaqi.get("co",  {}).get("v") or 0) or round(0.6 + (aqi/300)*1.4, 2)
                        o3  = float(iaqi.get("o3",  {}).get("v") or 0) or round(25 + aqi * 0.06, 1)
                        so2 = float(iaqi.get("so2", {}).get("v") or 0) or round(8  + aqi * 0.06, 1)
                        t   = float(iaqi.get("t",   {}).get("v") or 25)
                        h   = float(iaqi.get("h",   {}).get("v") or 55)
                        return {
                            "pm25":        round(pm25, 1),
                            "pm10":        round(pm10, 1),
                            "no2":         round(no2, 1),
                            "co":          round(co, 2),
                            "o3":          round(o3, 1),
                            "so2":         round(so2, 1),
                            "temperature": round(t, 1),
                            "humidity":    round(h, 1),
                            "aqi":         aqi,
                            "source":      "live",
                        }
        except Exception as e:
            print(f"[WAQI] {station_name}: {e}")

    return _mock_for(station_name)
