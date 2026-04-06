import json
from app.models import source_classifier, aqi_forecaster, anomaly_detector

def calculate_cpcb_aqi(pm25, pm10):
    """
    Automatically calculates the current Indian CPCB AQI based on PM2.5 and PM10.
    """
    def get_sub_aqi(val, breakpoints):
        for bp in breakpoints:
            if bp[0] <= val <= bp[1]:
                return ((bp[3] - bp[2]) / (bp[1] - bp[0])) * (val - bp[0]) + bp[2]
        return 500 # Max out if beyond severe

    # CPCB Breakpoints: [C_low, C_high, AQI_low, AQI_high]
    pm25_bp = [
        (0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200),
        (91, 120, 201, 300), (121, 250, 301, 400), (251, 1000, 401, 500)
    ]
    pm10_bp = [
        (0, 50, 0, 50), (51, 100, 51, 100), (101, 250, 101, 200),
        (251, 350, 201, 300), (351, 430, 301, 400), (431, 2000, 401, 500)
    ]

    aqi_pm25 = get_sub_aqi(pm25, pm25_bp)
    aqi_pm10 = get_sub_aqi(pm10, pm10_bp)
    
    # The final AQI is always the highest of the sub-indices
    return round(max(aqi_pm25, aqi_pm10), 1)

def normalize_units(raw_data):
    """
    Translates raw sensor/API data into the units the ML model expects.
    Temp: °C | Gases: µg/m³ | CO: mg/m³
    """
    clean_data = raw_data.copy()
    
    # Temperature
    temp = clean_data.get("temperature", 25.0)
    if temp > 200: clean_data["temperature"] = temp - 273.15 
    elif temp > 60 and temp < 150: clean_data["temperature"] = (temp - 32) * (5/9) 

    # Trace Gases (ppb to µg/m³)
    no2 = clean_data.get("no2", 0.0)
    if 0 < no2 < 1000: clean_data["no2"] = no2 * 1.88

    so2 = clean_data.get("so2", 0.0)
    if 0 < so2 < 1000: clean_data["so2"] = so2 * 2.62
        
    o3 = clean_data.get("o3", 0.0)
    if 0 < o3 < 1000: clean_data["o3"] = o3 * 1.96

    # CO (ppb to mg/m³)
    co = clean_data.get("co", 0.0)
    if 0 < co < 5000: clean_data["co"] = (co * 1.15) / 1000.0  

    for key in ["no2", "so2", "o3", "co"]:
        clean_data[key] = round(clean_data[key], 3)

    return clean_data

def run_local_tests():
    print("==================================================")
    print("   TESTING ML MODELS: NEW DELHI LIVE DATA")
    print("   Time: 18:41 | Mist, 29°C")
    print("==================================================\n")

    # Values extracted directly from your Delhi data
    raw_test_data = {
        "pm25": 30.0,           # µg/m³
        "pm10": 38.0,           # µg/m³
        "no2": 38.0,            # ppb
        "co": 216.0,            # ppb
        "o3": 53.0,             # ppb
        "so2": 13.0,            # ppb
        "temperature": 29.0,    # °C
        "relativehumidity": 40.0, # %
        "hour": 18,             # Evening Rush Hour
        "month": 3              # March
    }

    print(">>> 0. Normalizing Raw Data & Calculating Current AQI...")
    clean_test_data = normalize_units(raw_test_data)
    
    # USING THE INDIAN CPCB AQI FORMULA
    calculated_current_aqi = calculate_cpcb_aqi(clean_test_data["pm25"], clean_test_data["pm10"])
    
    print(json.dumps(clean_test_data, indent=2))
    print(f"\n[CALCULATED CURRENT INDIAN AQI]: {calculated_current_aqi}\n")

    # --- 1. Test Source Classifier ---
    print(">>> 1. Testing Source Classifier...")
    try:
        source_result = source_classifier.predict(**clean_test_data)
        print(json.dumps(source_result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
    print("\n")

    # --- 2. Test AQI Forecaster ---
    print(">>> 2. Testing AQI Forecaster...")
    try:
        mock_history = [
            calculated_current_aqi - 8,
            calculated_current_aqi - 6,
            calculated_current_aqi - 4,
            calculated_current_aqi - 3,
            calculated_current_aqi - 1,
            calculated_current_aqi,
            calculated_current_aqi
        ]
        
        forecast_args = {
            "aqi_history": mock_history,
            "temperature": clean_test_data["temperature"],
            "relativehumidity": clean_test_data["relativehumidity"],
            "co": clean_test_data["co"],
            "no2": clean_test_data["no2"],
            "pm25": clean_test_data["pm25"],
            "pm10": clean_test_data["pm10"],
            "hour": clean_test_data["hour"],
            "month": clean_test_data["month"]
        }
        forecast_result = aqi_forecaster.predict_aqi(**forecast_args)
        print(json.dumps(forecast_result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
    print("\n")

    # --- 3. Test Anomaly Detector ---
    print(">>> 3. Testing Anomaly Detector...")
    try:
        anomaly_result = anomaly_detector.detect(
            pm25=clean_test_data["pm25"],
            pm10=clean_test_data["pm10"],
            no2=clean_test_data["no2"],
            co=clean_test_data["co"],
            o3=clean_test_data["o3"],
            so2=clean_test_data["so2"],
            aqi=calculated_current_aqi,
            prev_aqi=calculated_current_aqi - 2
        )
        print(json.dumps(anomaly_result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
    print("\n")

if __name__ == "__main__":
    run_local_tests()