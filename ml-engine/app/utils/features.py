import pandas as pd
import numpy as np

CLASSIFIER_FEATURES = [
    "pm25", "pm10", "no2", "co", "o3", "so2",
    "pm_ratio", "no2_co_ratio", "so2_no2_ratio",
    "hour", "month", "season_code",
    "is_weekend", "is_morning_peak", "is_evening_peak",
    "is_burning_season", "temperature", "relativehumidity"
]

def add_time_features(df):
    df["hour"] = df["datetime"].dt.hour
    df["month"] = df["datetime"].dt.month
    df["weekday"] = df["datetime"].dt.weekday
    df["is_weekend"] = df["weekday"].isin([5, 6]).astype(int)
    
    # Season: Winter(Nov-Feb)=0, Summer(Mar-Jun)=1, Monsoon(Jul-Oct)=2
    def get_season(m):
        if m in [11, 12, 1, 2]: return 0
        elif m in [3, 4, 5, 6]: return 1
        else: return 2
    df["season_code"] = df["month"].apply(get_season)
    
    df["is_morning_peak"] = df["hour"].isin([8, 9, 10]).astype(int)
    df["is_evening_peak"] = df["hour"].isin([17, 18, 19, 20]).astype(int)
    df["is_burning_season"] = df["month"].isin([10, 11, 12]).astype(int)
    return df

def add_pollutant_ratios(df):
    df["pm_ratio"] = (df["pm10"] / df["pm25"]).clip(0.5, 10)
    df["no2_co_ratio"] = (df["no2"] / df["co"]).clip(0, 200)
    
    if "so2" in df.columns and "no2" in df.columns:
        df["so2_no2_ratio"] = (df["so2"] / df["no2"]).clip(0, 50)
    else:
        df["so2_no2_ratio"] = 0
    
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.fillna(0, inplace=True)
    return df

def add_lag_features(df, lags=[1, 3, 6, 12]):
    for lag in lags:
        df[f"aqi_lag_{lag}h"] = df["AQI"].shift(lag)
    
    df["aqi_delta_1h"] = df["AQI"] - df["aqi_lag_1h"]
    df["aqi_delta_3h"] = df["AQI"] - df["aqi_lag_3h"]
    
    df["aqi_roll_3h"] = df["AQI"].rolling(window=3).mean()
    df["aqi_roll_6h"] = df["AQI"].rolling(window=6).mean()
    df["aqi_roll_24h"] = df["AQI"].rolling(window=24).mean()
    
    # Fill NaN lags with median
    for col in df.columns:
        if "lag" in col or "delta" in col or "roll" in col:
            df[col] = df[col].fillna(df[col].median())
    return df

def build_features(df, include_lags=True):
    df = add_time_features(df)
    df = add_pollutant_ratios(df)
    if include_lags:
        df = add_lag_features(df)
    return df