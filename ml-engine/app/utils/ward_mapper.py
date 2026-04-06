import math
from app.data.stations import DELHI_STATIONS

def haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def nearest_station(ward_lat, ward_lng) -> dict:
    min_dist = float('inf')
    closest = None
    for station in DELHI_STATIONS:
        dist = haversine(ward_lat, ward_lng, station["lat"], station["lng"])
        if dist < min_dist:
            min_dist = dist
            closest = station
    return {"station": closest, "distance_km": min_dist}

def generate_ward_grid() -> list:
    # Generate 250 wards spread across a 16x16 grid bounding box
    wards = []
    lat_step = (28.88 - 28.40) / 16
    lng_step = (77.35 - 76.84) / 16
    
    ward_id = 1
    for i in range(16):
        for j in range(16):
            if ward_id > 250:
                break
            wards.append({
                "ward_id": ward_id,
                "name": f"Ward {ward_id}",
                "lat": 28.40 + (i * lat_step),
                "lng": 76.84 + (j * lng_step)
            })
            ward_id += 1
    return wards

WARD_CENTROIDS = generate_ward_grid()

def map_all_wards() -> list:
    mapped = []
    for w in WARD_CENTROIDS:
        closest = nearest_station(w["lat"], w["lng"])
        mapped.append({
            "ward_id": w["ward_id"],
            "ward_name": w["name"],
            "station_id": closest["station"]["id"],
            "station_name": closest["station"]["name"],
            "distance_km": closest["distance_km"]
        })
    return mapped

def get_ward_station_map() -> dict:
    mapping = map_all_wards()
    return {m["ward_id"]: m["station_id"] for m in mapping}