SOURCE_LABELS = {0: "Biomass", 1: "Industrial", 2: "Construction", 3: "Vehicular", 4: "Mixed"}

def label_source(row) -> str:
    # Primary Rules
    if row.get("pm25", 0) > 80 and row.get("co", 0) > 1.5 and row.get("hour", 0) in range(17, 24) and row.get("month", 0) in [10, 11, 12]:
        return "Biomass"
    if row.get("so2", 0) > 30 and row.get("no2", 0) > 50 and row.get("co", 0) > 1.3:
        return "Industrial"
    if row.get("pm_ratio", 0) > 2.5 and row.get("pm10", 0) > 100 and row.get("hour", 0) in range(7, 20):
        return "Construction"
    if row.get("hour", 0) in [7, 8, 9, 10, 17, 18, 19, 20] and row.get("no2", 0) > 25 and row.get("co", 0) > 0.7:
        return "Vehicular"
        
    # Fallback Rules for high baseline days
    if row.get("pm25", 0) > 120 and row.get("co", 0) > 1.8 and row.get("month", 0) in [11, 12, 1, 2]:
        return "Biomass"
    if row.get("so2", 0) > 40 and row.get("no2", 0) > 40:
        return "Industrial"
    if row.get("pm_ratio", 0) > 3.0 and row.get("pm10", 0) > 150:
        return "Construction"
    if row.get("no2", 0) > 20 and 6 <= row.get("hour", 0) <= 22 and row.get("pm25", 0) < 150:
        return "Vehicular"
        
    return "Mixed"

def add_source_labels(df):
    df["source"] = df.apply(label_source, axis=1)
    
    # Map text labels to numeric codes for the model
    label_to_code = {v: k for k, v in SOURCE_LABELS.items()}
    df["source_code"] = df["source"].map(label_to_code)
    return df