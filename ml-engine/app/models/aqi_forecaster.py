import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score

from app.data.csv_loader import load_and_clean_csv
from app.utils.features import add_time_features

MODEL_PATH = os.path.join(os.path.dirname(__file__), "forecaster.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "forecaster_scaler.pkl")

FORECAST_HOURS = 6
LAG_HOURS = 7

def build_forecast_dataset(df):
    # CRITICAL: Set datetime index, filter numeric, and resample with '1h'
    df = df.set_index("datetime")
    numeric_df = df.select_dtypes(include="number")
    hourly_df = numeric_df.resample("1h").mean().dropna()
    hourly_df = hourly_df.reset_index()
    
    # Re-add time features
    hourly_df = add_time_features(hourly_df)
    
    X_list, y_list = [], []
    feature_names = [f"aqi_lag_{i}" for i in range(1, LAG_HOURS + 1)] + \
                    ["temperature", "relativehumidity", "co", "no2", "pm25", "pm10", "hour", "month"]
    
    aqi_values = hourly_df["AQI"].values
    
    for i in range(LAG_HOURS, len(hourly_df) - FORECAST_HOURS):
        # Last 7 AQI values
        history = aqi_values[i - LAG_HOURS : i].tolist()
        
        # Current weather/pollutants/time
        current_features = [
            hourly_df.iloc[i]["temperature"], hourly_df.iloc[i]["relativehumidity"],
            hourly_df.iloc[i]["co"], hourly_df.iloc[i]["no2"],
            hourly_df.iloc[i]["pm25"], hourly_df.iloc[i]["pm10"],
            hourly_df.iloc[i]["hour"], hourly_df.iloc[i]["month"]
        ]
        
        # Next 6 hours of AQI
        future_aqi = aqi_values[i : i + FORECAST_HOURS].tolist()
        
        X_list.append(history + current_features)
        y_list.append(future_aqi)
        
    return np.array(X_list), np.array(y_list), feature_names

def train():
    print("Training AQI Forecaster (Gradient Boosting)...")
    df = load_and_clean_csv()
    X, y, feature_names = build_forecast_dataset(df)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    models = []
    
    # Train a separate model for each forecast hour
    for h in range(FORECAST_HOURS):
        y_h = y[:, h]
        
        model = GradientBoostingRegressor(
            n_estimators=200, 
            learning_rate=0.08, 
            max_depth=5, 
            subsample=0.8, 
            random_state=42
        )
        
        model.fit(X_scaled, y_h)
        preds = model.predict(X_scaled)
        
        mae = mean_absolute_error(y_h, preds)
        r2 = r2_score(y_h, preds)
        print(f"Hour +{h+1} Forecast -> MAE: {mae:.2f}, R2: {r2:.2f}")
        
        models.append(model)
        
    joblib.dump({"models": models, "features": feature_names, "lag_hours": LAG_HOURS}, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Saved forecaster to {MODEL_PATH}")

def load_model():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        raise FileNotFoundError("Forecaster models not trained.")
    data = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return data["models"], data["features"], scaler

def predict_aqi(aqi_history, temperature, relativehumidity, co, no2, pm25, pm10, hour, month) -> dict:
    models, features, scaler = load_model()
    
    input_features = aqi_history + [temperature, relativehumidity, co, no2, pm25, pm10, hour, month]
    input_scaled = scaler.transform([input_features])
    
    forecast = []
    for model in models:
        pred = model.predict(input_scaled)[0]
        forecast.append(round(pred, 1))
        
    return {
        "forecast": forecast,
        "hours_ahead": list(range(1, FORECAST_HOURS + 1)),
        "input_history": aqi_history
    }