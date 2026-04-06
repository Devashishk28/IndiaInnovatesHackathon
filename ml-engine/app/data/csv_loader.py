import pandas as pd
import os

def load_and_clean_csv():
    # Path to the CSV file you provided
    file_path = os.path.join(os.path.dirname(__file__), "vayu_strict_clean_all_params.csv")
    
    # Load data
    df = pd.read_csv(file_path)
    
    # Parse datetime
    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
    df["datetime"] = df["datetime"].dt.tz_convert("Asia/Kolkata").dt.tz_localize(None)
    
    # Drop columns that have too many missing values (as per blueprint)
    cols_to_drop = ["nox", "wind_direction", "wind_speed"]
    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns], errors="ignore")
    
    # Fill specific nulls with median
    if "no" in df.columns:
        df["no"] = df["no"].fillna(df["no"].median())
    if "relativehumidity" in df.columns:
        df["relativehumidity"] = df["relativehumidity"].fillna(df["relativehumidity"].median())
    if "temperature" in df.columns:
        df["temperature"] = df["temperature"].fillna(df["temperature"].median())
        
    # Drop rows where critical target pollutants/AQI are missing
    critical_cols = ["pm25", "pm10", "no2", "co", "AQI"]
    df = df.dropna(subset=[col for col in critical_cols if col in df.columns])
    
    # Sort chronologically
    df = df.sort_values("datetime", ascending=True).reset_index(drop=True)
    
    return df

if __name__ == "__main__":
    clean_df = load_and_clean_csv()
    print(f"Data cleaned successfully! Rows remaining: {len(clean_df)}")