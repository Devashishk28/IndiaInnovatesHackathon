from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routes import classify, predict, recommend, live
from app.models import source_classifier, aqi_forecaster, anomaly_detector

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check model status on startup
    print("--- Checking ML Models ---")
    models = {
        "Classifier": source_classifier.MODEL_PATH,
        "Forecaster": aqi_forecaster.MODEL_PATH,
        "Anomaly": anomaly_detector.MODEL_PATH
    }
    for name, path in models.items():
        status = "OK" if os.path.exists(path) else "NOT TRAINED"
        print(f"{name}: {status}")
    print("--------------------------")
    yield

app = FastAPI(title="AQI ML Engine", lifespan=lifespan)

# CORS for frontend and Node backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classify.router, prefix="/ml", tags=["Classification"])
app.include_router(predict.router, prefix="/ml", tags=["Prediction"])
app.include_router(recommend.router, prefix="/ml", tags=["Recommendations"])
app.include_router(live.router, tags=["Live Data"])

@app.get("/")
def root():
    return {
        "message": "AQI ML Engine Running",
        "endpoints": ["/ml/classify-source", "/ml/predict-aqi", "/ml/detect-anomaly", "/ml/recommend"]
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/status")
def model_status():
    return {
        "classifier_ready": os.path.exists(source_classifier.MODEL_PATH),
        "forecaster_ready": os.path.exists(aqi_forecaster.MODEL_PATH),
        "anomaly_ready": os.path.exists(anomaly_detector.MODEL_PATH)
    }