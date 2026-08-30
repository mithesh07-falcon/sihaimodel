import asyncio
import json
import logging
import os
import random
import sys
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import pandas as pd

from .schemas import EngineParameters, DiagnosisResponse
from .reliability import calculate_reliability

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AeroTwinBackend")

app = FastAPI(title="AeroTwin Digital Twin GCS Backend")

# Enable CORS for frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = None
model_classes = []

# Path configurations
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(CURRENT_DIR, "model")
MODEL_FILE = os.path.join(MODEL_DIR, "engine_model.joblib")

@app.on_event("startup")
def startup_event():
    global model, model_classes
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    if not os.path.exists(MODEL_FILE):
        logger.info("Model joblib not found. Performing self-healing model generation...")
        try:
            from .model.generate_dataset import generate_engine_data
            df = generate_engine_data(4000)
            csv_path = os.path.join(MODEL_DIR, "engine_telemetry.csv")
            df.to_csv(csv_path, index=False)
            
            from .model.train_model import train_model
            train_model()
        except Exception as e:
            logger.error(f"Self-healing model training failed: {e}")
            sys.exit(1)
            
    # Load model
    try:
        model = joblib.load(MODEL_FILE)
        model_classes = list(model.classes_)
        logger.info(f"Loaded classifier model successfully. Classes: {model_classes}")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        sys.exit(1)

@app.post("/api/diagnose", response_model=DiagnosisResponse)
def diagnose_engine(params: EngineParameters):
    # Map parameters to features array in correct order
    features = [
        "rpm", "cht", "egt", "oil_pressure", "oil_temp", 
        "fuel_flow", "map", "vibration", "voltage", 
        "altitude", "ambient_temp", "afr"
    ]
    
    input_dict = params.model_dump()
    X_sample = pd.DataFrame([input_dict])[features]
    
    # Predict probabilities and class
    probabilities = model.predict_proba(X_sample)[0]
    prediction = model.predict(X_sample)[0]
    
    pred_idx = model_classes.index(prediction)
    confidence = float(probabilities[pred_idx])
    
    # Calculate Deviation-based reliability score
    reliability = calculate_reliability(input_dict)
    
    # Rules-based reasoning and details customization
    reasoning = []
    recommended_action = "Advisory: System nominal. No pilot action necessary."
    status = "Healthy"
    fault_component = "None"
    
    if prediction == "Healthy":
        status = "Healthy"
        fault_component = "Propulsion Core"
        reasoning.append("All primary and secondary sensors reporting inside nominal bands.")
        if reliability < 90:
            status = "Warning"
            reasoning.append("Subtle parameter drifts observed, overall envelope slightly deviated.")
            recommended_action = "Monitor telemetry trend. Check air/fuel filters at next landing."
            
    elif prediction == "Overheating":
        status = "Critical" if params.cht > 132 or params.oil_temp > 118 else "Warning"
        fault_component = "Cylinder Assembly / Liquid Jacket"
        
        if params.cht > 125:
            reasoning.append(f"Cylinder Head Temp is elevated at {params.cht:.1f}°C (Limit: 125°C)")
        if params.egt > 860:
            reasoning.append(f"Exhaust Gas Temp elevated at {params.egt:.1f}°C (Limit: 860°C)")
        if params.oil_temp > 105:
            reasoning.append(f"Oil heat dissipation degraded: oil temp is at {params.oil_temp:.1f}°C")
            
        recommended_action = "Reduce throttle to 75%. Rich-up AFR mixture (Auto/Rich) to gas-cool cylinders. Lower cruise altitude."
        
    elif prediction == "Oil Starvation":
        status = "Critical"
        fault_component = "Oil Pump & Sump Circuit"
        
        if params.oil_pressure < 250:
            reasoning.append(f"Oil Pressure has sagged to {params.oil_pressure:.1f} kPa (Nominal: 300-480 kPa)")
        if params.oil_temp > 110:
            reasoning.append(f"Thermal friction spikes oil temperature to {params.oil_temp:.1f}°C")
        if params.vibration > 1.5:
            reasoning.append(f"Frictional metal contact increases shaft vibration to {params.vibration:.2f} g")
            
        recommended_action = "CRITICAL: Engine seizure hazard. Reduce throttle to minimum necessary flight speed, initiate immediate RTB (Return to Base)."
        
    elif prediction == "Bearing Wear":
        status = "Warning"
        fault_component = "Crankshaft & Main Journal Bearings"
        
        if params.vibration > 1.6:
            reasoning.append(f"Vibration amplitude has exceeded limits: {params.vibration:.2f} g (Limit: 1.6 g)")
        if abs(params.rpm - 4800) > 400:
            reasoning.append(f"Shaft RPM fluctuates abnormally: {params.rpm:.0f} RPM")
            
        recommended_action = "Maintain engine speed outside resonance band (4200 - 4500 RPM). Avoid rapid throttle transients. Inspect bearings post-flight."
        
    elif prediction == "Fuel-Lean Misfire":
        status = "Warning"
        fault_component = "Fuel Injection Rail (EFI)"
        
        if params.afr > 15.4:
            reasoning.append(f"Combustion running extremely lean: AFR is {params.afr:.2f} (Stoichiometric: 14.7)")
        if params.fuel_flow < 15.0:
            reasoning.append(f"Fuel flow rate is below cruise nominals: {params.fuel_flow:.1f} L/h")
        if params.egt > 850:
            reasoning.append(f"Lean fuel combustion spikes cylinder exhaust gas temp (EGT) to {params.egt:.1f}°C")
            
        recommended_action = "Set fuel mixture channel to RICH or AUTO. Maintain throttle. If misfires persist, reduce power and vector to secondary landing field."

    return DiagnosisResponse(
        status=status,
        fault_component=fault_component,
        fault_type=prediction,
        confidence=round(confidence, 2),
        mission_reliability_score=reliability,
        reasoning=reasoning,
        recommended_action=recommended_action
    )

# WebSocket state machine variables (default target state)
SIM_TARGETS = {
    "nominal": {
        "rpm": 4800.0, "cht": 110.0, "egt": 810.0, "oil_pressure": 380.0, "oil_temp": 92.0,
        "fuel_flow": 18.5, "map": 101.0, "vibration": 1.1, "voltage": 14.2, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 14.7
    },
    "overheating": {
        "rpm": 5200.0, "cht": 138.0, "egt": 895.0, "oil_pressure": 350.0, "oil_temp": 114.0,
        "fuel_flow": 21.0, "map": 105.0, "vibration": 1.25, "voltage": 14.1, "altitude": 3500.0,
        "ambient_temp": 10.0, "afr": 14.8
    },
    "oil_starvation": {
        "rpm": 4700.0, "cht": 122.0, "egt": 820.0, "oil_pressure": 175.0, "oil_temp": 126.0,
        "fuel_flow": 18.0, "map": 100.0, "vibration": 1.8, "voltage": 14.0, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 14.7
    },
    "bearing_wear": {
        "rpm": 4600.0, "cht": 115.0, "egt": 810.0, "oil_pressure": 360.0, "oil_temp": 108.0,
        "fuel_flow": 17.5, "map": 99.0, "vibration": 3.2, "voltage": 13.8, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 14.7
    },
    "lean_misfire": {
        "rpm": 4400.0, "cht": 112.0, "egt": 865.0, "oil_pressure": 360.0, "oil_temp": 95.0,
        "fuel_flow": 13.2, "map": 95.0, "vibration": 1.6, "voltage": 14.0, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 16.8
    }
}

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    logger.info("GCS Frontend connected via WebSocket.")
    
    current_state = "nominal"
    
    # Initialize current values
    curr_vals = dict(SIM_TARGETS["nominal"])
    
    try:
        while True:
            # Check for messages from client (e.g. changing presets or settings)
            try:
                # Non-blocking wait for incoming command
                data_str = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                data = json.loads(data_str)
                if "preset" in data:
                    preset = data["preset"]
                    if preset in SIM_TARGETS:
                        current_state = preset
                        logger.info(f"Simulation preset updated to: {current_state}")
                # Users can manually change variables via websocket
                if "manual_adjust" in data:
                    adjustments = data["manual_adjust"]
                    for k, v in adjustments.items():
                        if k in curr_vals:
                            curr_vals[k] = float(v)
            except asyncio.TimeoutError:
                pass # No messages received, continue streaming loop
            except Exception as e:
                logger.warning(f"Error parsing websocket message: {e}")
            
            # Smoothly transition (lerp) toward target simulation state
            target_vals = SIM_TARGETS[current_state]
            for key in curr_vals:
                # Manual edits skip simple lerp if they are active (handled in main loop)
                # Apply gradual interpolation
                curr_vals[key] += (target_vals[key] - curr_vals[key]) * 0.1
                
                # Add tiny random walks/noise
                noise_scales = {
                    "rpm": 15, "cht": 0.4, "egt": 1.5, "oil_pressure": 1.5, "oil_temp": 0.3,
                    "fuel_flow": 0.08, "map": 0.25, "vibration": 0.03, "voltage": 0.02,
                    "altitude": 2.0, "ambient_temp": 0.1, "afr": 0.02
                }
                scale = noise_scales.get(key, 0.05)
                curr_vals[key] += random.normalvariate(0, scale)
            
            # Ensure physical constraints
            curr_vals["rpm"] = max(1000, curr_vals["rpm"])
            curr_vals["cht"] = max(40, curr_vals["cht"])
            curr_vals["vibration"] = max(0.05, curr_vals["vibration"])
            
            # Send current telemetry frame to UI
            await websocket.send_text(json.dumps({
                "telemetry": curr_vals,
                "preset": current_state
            }))
            
            await asyncio.sleep(1.0)
            
    except WebSocketDisconnect:
        logger.info("GCS Frontend disconnected.")
    except Exception as e:
        logger.error(f"WebSocket telemetry error: {e}")
