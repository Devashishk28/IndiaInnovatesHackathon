import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from app.data.csv_loader import load_and_clean_csv
from app.utils.features import build_features, CLASSIFIER_FEATURES
from app.utils.labeler import add_source_labels, SOURCE_LABELS

MODEL_PATH = os.path.join(os.path.dirname(__file__), "classifier.pkl")

def prepare_data():
    df = load_and_clean_csv()
    df = build_features(df, include_lags=False)
    df = add_source_labels(df)
    
    df = df.dropna(subset=CLASSIFIER_FEATURES + ["source_code"])
    X = df[CLASSIFIER_FEATURES].values
    y = df["source_code"].values
    return X, y, CLASSIFIER_FEATURES

def train():
    print("Training Source Classifier (Random Forest)...")
    X, y, feature_names = prepare_data()
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(
        n_estimators=200, 
        max_depth=15,
        min_samples_leaf=5, 
        class_weight="balanced", 
        random_state=42, 
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    print("\nClassification Report:")
    print(classification_report(y_test, model.predict(X_test)))
    
    # Save the model
    joblib.dump({"model": model, "features": feature_names}, MODEL_PATH)
    print(f"Saved classifier to {MODEL_PATH}")

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    data = joblib.load(MODEL_PATH)
    return data["model"], data["features"]

def predict(pm25, pm10, no2, co, o3, so2, temperature, relativehumidity, hour, month) -> dict:
    model, features = load_model()
    
    # Calculate derived features matching training
    pm_ratio = max(min(pm10 / pm25 if pm25 > 0 else 0, 10), 0.5)
    no2_co_ratio = max(min(no2 / co if co > 0 else 0, 200), 0)
    so2_no2_ratio = max(min(so2 / no2 if no2 > 0 else 0, 50), 0)
    
    season_code = 0 if month in [11, 12, 1, 2] else (1 if month in [3, 4, 5, 6] else 2)
    is_weekend = 0 # Defaulting for simplicity in live predict
    is_morning_peak = 1 if hour in [8, 9, 10] else 0
    is_evening_peak = 1 if hour in [17, 18, 19, 20] else 0
    is_burning_season = 1 if month in [10, 11, 12] else 0
    
    input_data = pd.DataFrame([[
        pm25, pm10, no2, co, o3, so2,
        pm_ratio, no2_co_ratio, so2_no2_ratio,
        hour, month, season_code,
        is_weekend, is_morning_peak, is_evening_peak,
        is_burning_season, temperature, relativehumidity
    ]], columns=features)
    
    probs = model.predict_proba(input_data)[0]
    pred_class = model.predict(input_data)[0]
    
    all_probabilities = {SOURCE_LABELS[i]: round(prob * 100, 1) for i, prob in enumerate(probs)}
    
    return {
        "source": SOURCE_LABELS[pred_class],
        "confidence": round(probs[pred_class] * 100, 1),
        "all_probabilities": all_probabilities
    }