import time
from app.models import source_classifier, aqi_forecaster, anomaly_detector

def run_training():
    print("========================================")
    print("   STARTING ML MODEL TRAINING PIPELINE  ")
    print("========================================\n")
    
    start_time = time.time()
    
    try:
        # 1. Train Classifier
        print(">>> 1. Training Source Classifier...")
        source_classifier.train()
        print("Done.\n")
        
        # 2. Train Forecaster
        print(">>> 2. Training AQI Forecaster...")
        aqi_forecaster.train()
        print("Done.\n")
        
        # 3. Train Anomaly Detector
        print(">>> 3. Training Anomaly Detector...")
        anomaly_detector.train()
        print("Done.\n")
        
        elapsed = time.time() - start_time
        print("========================================")
        print(f" SUCCESS! All models trained in {elapsed:.1f}s")
        print("========================================")
        print("\nTo start the ML API server, run:")
        print("uvicorn app.main:app --reload --port 8000")
        
    except Exception as e:
        print("\n!!! ERROR DURING TRAINING !!!")
        print(str(e))

if __name__ == "__main__":
    run_training()