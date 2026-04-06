## VayuVigyan – Hyper-Local AQI Intelligence System

# India Innovates 2026 Hackathon Project

VayuVigyan is an AI-powered system designed to provide real-time air quality monitoring, prediction, and actionable insights at a hyper-local level.

## Team Members
Devashish Kubade
Saurav Biswal
Ayansh Jain
Shivam Chouthe
Kalyani Jadhao
SCOE, Pune
## Problem Statement

Air pollution data available today is often too generalized, usually limited to city-level averages. It does not provide actionable insights, lacks identification of pollution sources, and fails to predict future air quality trends. This limits effective decision-making for both citizens and authorities.

## Proposed Solution:

VayuVigyan addresses these challenges through:

Hyper-local AQI mapping at ward level instead of city averages
Machine learning-based source detection (traffic, construction, dust, burning)
3–5 day air quality prediction
Real-time monitoring of pollution spikes
Smart recommendations for citizens and authorities
Policy impact tracking to measure effectiveness of interventions
Data-driven decision support for efficient resource allocation
System Architecture
Layer 1: Data Ingestion
OpenAQ API and CPCB datasets
Python-based data collection
15-minute refresh cycle
Layer 2: Processing and AI
XGBoost for prediction
SHAP for explainable AI
Source detection with high accuracy
Layer 3: Backend Services
FastAPI
PostgreSQL
Pydantic and Uvicorn
Low-latency API responses
Layer 4: Frontend
React.js
Tailwind CSS
Shadcn UI
Leaflet.js for mapping
Tech Stack

# Frontend: React.js, Tailwind CSS, Shadcn UI
# Backend: FastAPI, Pydantic, Uvicorn
# AI/ML: XGBoost, Scikit-learn, SHAP
# Mapping: Leaflet.js, OpenStreetMap, GeoJSON
# Data and Infrastructure: OpenAQ API, Pandas, NumPy, Vercel

## Key Features:

Pollutant Fingerprinting
Uses PM2.5, PM10, and NO2 ratios to identify pollution sources with precision.

Ward-Level Intelligence
Detects localized pollution spikes and enables better planning.

Explainable AI
Provides clear reasoning behind predictions for transparency.

Decision Support System
Connects insights to actionable steps for authorities, enabling targeted interventions instead of large-scale shutdowns.

## Impact

For Citizens:

Better health awareness
Improved daily activity planning
Reduced pollution exposure

For Authorities:

Data-driven decisions
Efficient allocation of resources
Monitoring effectiveness of policies
Workflow

Data Collection → Processing → Prediction → Visualization → Actionable Insights

## Future Scope
Mobile application integration
IoT-based sensor deployment
Clean route navigation system
Integration with government dashboards
References
OpenAQ API
CPCB emission datasets
CSTEP research on PM10 monitoring
NO2 health impact studies
