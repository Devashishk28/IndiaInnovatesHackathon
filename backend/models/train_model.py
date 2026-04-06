"""
Train both ML models and save .pkl files.
Run: python models/train_model.py from backend/ directory.
"""
import os
import sys
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

# Ensure models directory exists
MODELS_DIR = Path(__file__).parent
MODELS_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────
# SHARED LABEL LOGIC
# ──────────────────────────────────────────────
def _label_source(row) -> int:
    """
    0=Biomass, 1=Industrial, 2=Construction, 3=Vehicular, 4=Mixed
    """
    pm25, pm10, no2, co, so2 = (
        row["pm25"], row["pm10"], row["no2"], row["co"], row["so2"]
    )
    hour, month = int(row["hour_of_day"]), int(row["month"])
    pm_ratio = pm25 / max(pm10, 1)

    if pm25 > 80 and co > 1.5 and hour in range(17, 25) and month in [10, 11, 12, 1]:
        return 0  # Biomass
    if so2 > 30 and no2 > 50 and co > 1.3:
        return 1  # Industrial
    if pm_ratio > 2.5 and pm10 > 100 and 7 <= hour <= 20:
        return 2  # Construction
    if hour in [8, 9, 10, 17, 18, 19, 20] and no2 > 25 and co > 0.7:
        return 3  # Vehicular
    return 4  # Mixed


# ──────────────────────────────────────────────
# MODEL 1: Random Forest Source Detector
# ──────────────────────────────────────────────
def generate_source_training_data(n: int = 6000) -> pd.DataFrame:
    np.random.seed(42)
    rows = []
    for _ in range(n):
        hour   = np.random.randint(0, 24)
        month  = np.random.randint(1, 13)
        dow    = np.random.randint(0, 7)
        pm25   = np.random.uniform(10, 400)
        pm10   = np.random.uniform(20, 500)
        no2    = np.random.uniform(5,  150)
        co     = np.random.uniform(0.2, 4.0)
        o3     = np.random.uniform(5,  120)
        so2    = np.random.uniform(2,  80)
        temp   = np.random.uniform(5,  45)
        hum    = np.random.uniform(20, 95)
        ws     = np.random.uniform(0,  15)

        pm25_pm10_ratio = pm25 / max(pm10, 1)
        no2_co_ratio    = no2  / max(co,   0.01)

        row = dict(
            pm25=pm25, pm10=pm10, no2=no2, co=co, o3=o3, so2=so2,
            temperature=temp, humidity=hum, wind_speed=ws,
            hour_of_day=hour, day_of_week=dow, month=month,
            pm25_pm10_ratio=pm25_pm10_ratio, no2_co_ratio=no2_co_ratio
        )
        row["label"] = _label_source(row)
        rows.append(row)
    return pd.DataFrame(rows)


def train_source_detector():
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report

    print("[*] Generating source detector training data ...")
    df = generate_source_training_data(6000)

    FEATURES = [
        "pm25", "pm10", "no2", "co", "o3", "so2",
        "temperature", "humidity", "wind_speed",
        "hour_of_day", "day_of_week", "month",
        "pm25_pm10_ratio", "no2_co_ratio"
    ]
    X = df[FEATURES].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    print(classification_report(y_test, clf.predict(X_test),
          target_names=["Biomass","Industrial","Construction","Vehicular","Mixed"]))

    out = MODELS_DIR / "source_detector.pkl"
    joblib.dump({"model": clf, "features": FEATURES}, out)
    print(f"[OK] Saved {out}")
    return clf, FEATURES


# ──────────────────────────────────────────────
# MODEL 2: XGBoost AQI Forecaster
# ──────────────────────────────────────────────
def generate_forecast_training_data(n_sequences: int = 3000):
    np.random.seed(7)
    X_rows, y_rows = [], []

    base_aqis = np.random.uniform(80, 420, n_sequences)
    for base in base_aqis:
        # Simulate 24h history
        history = []
        val = base
        for _ in range(24):
            val = np.clip(val + np.random.normal(0, 15), 60, 500)
            history.append(val)

        hour  = np.random.randint(0, 24)
        month = np.random.randint(1, 13)
        temp  = np.random.uniform(10, 42)
        hum   = np.random.uniform(30, 90)
        ws    = np.random.uniform(0, 12)
        pm25  = base * 0.38 + np.random.normal(0, 5)
        pm10  = base * 0.55 + np.random.normal(0, 8)
        no2   = 50 + base * 0.15 + np.random.normal(0, 5)
        blh   = np.random.uniform(200, 2000)

        features = list(history[:24]) + [pm25, pm10, no2, temp, hum, ws, blh, hour, month]
        X_rows.append(features)

        # 24h future forecast with trend
        trend = np.random.choice([-1, 0, 1], p=[0.3, 0.4, 0.3])
        future = []
        fval = history[-1]
        for h in range(24):
            fval = np.clip(fval + trend * 3 + np.random.normal(0, 10), 60, 500)
            future.append(fval)
        y_rows.append(future)

    X = np.array(X_rows)
    y = np.array(y_rows)
    return X, y


def train_aqi_forecaster():
    try:
        import xgboost as xgb
        USE_XGB = True
    except ImportError:
        from sklearn.ensemble import GradientBoostingRegressor
        USE_XGB = False

    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split

    print("[*] Generating AQI forecaster training data ...")
    X, y = generate_forecast_training_data(3000)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    models_per_hour = []
    maes = []
    print("  Training 24 hourly models ...", end=" ", flush=True)
    for h in range(24):
        if USE_XGB:
            m = xgb.XGBRegressor(
                n_estimators=200, learning_rate=0.08, max_depth=6,
                subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1
            )
        else:
            from sklearn.ensemble import GradientBoostingRegressor
            m = GradientBoostingRegressor(n_estimators=200, learning_rate=0.08, max_depth=5, random_state=42)

        m.fit(X_train, y_train[:, h])
        preds = m.predict(X_test)
        mae = np.mean(np.abs(preds - y_test[:, h]))
        maes.append(mae)
        models_per_hour.append(m)
        if h % 6 == 0:
            print(f"h{h}", end=" ", flush=True)
    print()
    print(f"  Avg MAE across 24h: {np.mean(maes):.2f}")

    out = MODELS_DIR / "aqi_forecaster.pkl"
    joblib.dump({"models": models_per_hour, "scaler": scaler}, out)
    print(f"[OK] Saved {out}")
    return models_per_hour, scaler


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import time
    print("=" * 60)
    print("Delhi AQI Platform — Model Training")
    print("=" * 60)

    t0 = time.time()
    train_source_detector()
    print()
    train_aqi_forecaster()
    print()
    print(f"All models trained in {time.time() - t0:.1f}s")

    # Verify files
    for fname in ["source_detector.pkl", "aqi_forecaster.pkl"]:
        p = MODELS_DIR / fname
        if p.exists():
            print(f"✓ {fname} ({p.stat().st_size // 1024} KB)")
        else:
            print(f"✗ MISSING: {fname}")
            sys.exit(1)
    print("Training complete.")
