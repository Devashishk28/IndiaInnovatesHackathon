"""
IDW (Inverse Distance Weighting) spatial interpolation for non-station wards.
"""
import math
from typing import List, Dict


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def idw_interpolate(
    target_lat: float,
    target_lng: float,
    stations: List[Dict],   # [{lat, lng, aqi, ward_name, pm25, pm10, ...}]
    power: float = 2.0,
    min_stations: int = 3,
) -> Dict:
    """
    Returns interpolated AQI + metadata for a non-station ward.
    stations must have keys: lat, lng, aqi, ward_name
    """
    if not stations:
        return {"aqi": 200, "is_estimated": True, "confidence": 0.0, "nearest_station": "unknown"}

    distances = []
    for s in stations:
        d = _haversine_km(target_lat, target_lng, s["lat"], s["lng"])
        d = max(d, 0.01)  # prevent division by zero
        distances.append((d, s))

    distances.sort(key=lambda x: x[0])

    # Use nearest N stations (max 8)
    use = distances[:max(min_stations, min(8, len(distances)))]

    weights = [1.0 / (d ** power) for d, _ in use]
    total_w = sum(weights)

    aqi_est = sum(w * s["aqi"] for w, (_, s) in zip(weights, use)) / total_w

    # Interpolate pollutants too
    def interp_field(key, default):
        vals = [s.get(key, default) for _, s in use]
        return sum(w * v for w, v in zip(weights, vals)) / total_w

    pm25 = interp_field("pm25", aqi_est * 0.38)
    pm10 = interp_field("pm10", aqi_est * 0.55)
    no2  = interp_field("no2",  50 + aqi_est * 0.15)
    co   = interp_field("co",   0.8)
    o3   = interp_field("o3",   30)
    so2  = interp_field("so2",  10)

    nearest = distances[0][1]["ward_name"]
    nearest_dist = distances[0][0]

    # Confidence: higher when nearest station is close
    confidence = max(0.3, min(0.95, 1.0 - (nearest_dist / 15.0)))

    return {
        "aqi":             max(60, round(aqi_est)),
        "pm25":            round(pm25, 1),
        "pm10":            round(pm10, 1),
        "no2":             round(no2, 1),
        "co":              round(co, 2),
        "o3":              round(o3, 1),
        "so2":             round(so2, 1),
        "is_estimated":    True,
        "confidence":      round(confidence, 2),
        "nearest_station": nearest,
        "nearest_dist_km": round(nearest_dist, 2),
    }


def interpolate_all_non_station_wards(
    real_station_data: List[Dict],  # enriched real station wards (with aqi, lat, lng)
    non_station_wards: List[Dict],  # ward dicts with lat, lng
) -> List[Dict]:
    """
    Apply IDW to every non-station ward.
    Returns list of wards enriched with interpolated AQI values.
    """
    results = []
    for ward in non_station_wards:
        interp = idw_interpolate(ward["lat"], ward["lng"], real_station_data)
        # Apply zone_factor on top of interpolated value
        zf = ward.get("zone_factor", 1.0)
        base_aqi = interp["aqi"]
        adjusted = max(60, round(base_aqi * zf / 1.15))  # normalize zone_factor around 1.15
        interp["aqi"] = max(60, adjusted)
        results.append({**ward, **interp})
    return results
