import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from app.data.csv_loader import load_and_clean_csv

MODEL_PATH = os.path.join(os.path.dirname(__file__), "anomaly.pkl")
ANOMALY_FEATURES = ["pm25", "pm10", "no2", "co", "o3", "so2", "AQI"]
SPIKE_THRESHOLD = 40.0

def build_anomaly_dataset(df):
    # Filter for normal rows to train what "normal" looks like
    df["aqi_diff"] = df["AQI"].diff().abs()
    normal_df = df[df["aqi_diff"] < SPIKE_THRESHOLD].copy()
    normal_df = normal_df.dropna(subset=ANOMALY_FEATURES)
    
    X = normal_df[ANOMALY_FEATURES].values
    return X, ANOMALY_FEATURES

def train():
    print("Training Anomaly Detector (Isolation Forest)...")
    df = load_and_clean_csv()
    X, feature_names = build_anomaly_dataset(df)
    
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1)
    model.fit(X)
    
    joblib.dump({"model": model, "features": feature_names}, MODEL_PATH)
    print(f"Saved anomaly detector to {MODEL_PATH}")

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Anomaly model not trained.")
    data = joblib.load(MODEL_PATH)
    return data["model"], data["features"]

def detect(pm25, pm10, no2, co, o3, so2, aqi, prev_aqi=None) -> dict:
    model, features = load_model()
    
    input_data = np.array([[pm25, pm10, no2, co, o3, so2, aqi]])
    
    # Isolation forest returns -1 for anomaly, 1 for normal
    prediction = model.predict(input_data)[0]
    is_anomaly = bool(prediction == -1)
    
    # Get raw anomaly score (lower is more anomalous)
    raw_score = model.score_samples(input_data)[0]
    anomaly_score = round(((raw_score * -1) * 100), 1)  # Normalize roughly to 0-100 scale
    
    # Heuristic spike detection
    spike_detected = False
    spike_magnitude = 0.0
    if prev_aqi is not None:
        spike_magnitude = abs(aqi - prev_aqi)
        if spike_magnitude >= SPIKE_THRESHOLD:
            spike_detected = True
            is_anomaly = True
            
    severity = "Normal"
    message = "Reading is within normal bounds."
    
    if is_anomaly:
        if spike_detected and spike_magnitude > 100:
            severity = "Critical"
            message = f"Massive AQI spike detected: {round(spike_magnitude)} points."
        elif spike_detected:
            severity = "High"
            message = f"Sudden AQI spike detected: {round(spike_magnitude)} points."
        else:
            severity = "Medium"
            message = "Unusual pollutant ratio detected."
            
    return {
        "is_anomaly": is_anomaly,
        "anomaly_score": anomaly_score,
        "spike_detected": spike_detected,
        "spike_magnitude": round(spike_magnitude, 1),
        "severity": severity,
        "message": message
    }