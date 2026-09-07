import asyncio
import collections
from contextlib import asynccontextmanager
import json
import logging
import os
import random
import sys
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import pandas as pd

from .schemas import EngineParameters, DiagnosisResponse, DLDiagnosisResponse
from .reliability import calculate_reliability, calculate_maintenance_score, calculate_rul, calculate_failure_probability

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AeroTwinBackend")

# Path configurations
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(CURRENT_DIR, "model")
LEGACY_MODEL_FILE = os.path.join(MODEL_DIR, "engine_model.joblib")
DL_DIR = os.path.join(MODEL_DIR, "dl_models")
SAVED_MODELS_DIR = os.path.join(DL_DIR, "saved_models")

# Global model references
legacy_model = None
legacy_model_classes = []

dl_autoencoder = None
dl_cnn = None
dl_bilstm = None
dl_tft = None
sensor_scaler = None
rul_scaler = None
dl_metrics = {}
anomaly_threshold = 0.207359

# Rolling sequence buffer for temporal deep learning models (length = 32 frames)
telemetry_buffer = collections.deque(maxlen=32)

FAULT_CLASSES = [
    "NORMAL",
    "BEARING_DEGRADATION",
    "PROPELLER_IMBALANCE",
    "ENGINE_MISFIRE",
    "LOW_OIL_PRESSURE",
    "OVERHEATING",
    "COOLING_SYSTEM_FAILURE",
    "SENSOR_ANOMALY"
]

SENSOR_FEATURES = [
    "rpm", "throttle", "engine_load", 
    "oil_pressure", "oil_temperature", "cht", "egt", "fuel_flow", 
    "vibration_rms", "vibration_peak", "vibration_1x", "vibration_2x", 
    "battery_voltage", "alternator_voltage", "ambient_temperature", "ambient_pressure"
]

RUL_FEATURES = [
    "rpm", "throttle", "engine_load", 
    "oil_pressure", "oil_temperature", "cht", "egt", "fuel_flow", 
    "vibration_rms", "vibration_peak", "vibration_1x", "vibration_2x", 
    "ambient_temperature", "ambient_pressure", "engine_operating_hours"
]


def load_all_models():
    global legacy_model, legacy_model_classes
    global dl_autoencoder, dl_cnn, dl_bilstm, dl_tft, sensor_scaler, rul_scaler, dl_metrics, anomaly_threshold

    # 1. Load or train legacy model
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(LEGACY_MODEL_FILE):
        logger.info("Legacy model joblib not found. Generating self-healing baseline...")
        try:
            from .model.generate_dataset import generate_engine_data
            df = generate_engine_data(2000)
            csv_path = os.path.join(MODEL_DIR, "engine_telemetry.csv")
            df.to_csv(csv_path, index=False)
            from .model.train_model import train_model
            train_model()
        except Exception as e:
            logger.warning(f"Self-healing baseline training note: {e}")

    try:
        if os.path.exists(LEGACY_MODEL_FILE):
            legacy_model = joblib.load(LEGACY_MODEL_FILE)
            legacy_model_classes = list(legacy_model.classes_)
            logger.info(f"Loaded legacy classifier. Classes: {legacy_model_classes}")
    except Exception as e:
        logger.error(f"Error loading legacy model: {e}")

    # 2. Load Deep Learning models & scalers
    if os.path.exists(SAVED_MODELS_DIR):
        try:
            import tensorflow as tf
            from .model.dl_models.degradation_bilstm_attention import TemporalAttention
            from .model.dl_models.rul_transformer import PositionalEncoding, GatedResidualBlock

            ae_path = os.path.join(SAVED_MODELS_DIR, "lstm_autoencoder.keras")
            cnn_path = os.path.join(SAVED_MODELS_DIR, "fault_classifier_1d_cnn.keras")
            bilstm_path = os.path.join(SAVED_MODELS_DIR, "degradation_bilstm_attention.keras")
            tft_path = os.path.join(SAVED_MODELS_DIR, "rul_tft_transformer.keras")

            if os.path.exists(ae_path):
                dl_autoencoder = tf.keras.models.load_model(ae_path)
                logger.info("Loaded LSTM Autoencoder model.")
            if os.path.exists(cnn_path):
                dl_cnn = tf.keras.models.load_model(cnn_path)
                logger.info("Loaded 1D CNN Fault Classifier model.")
            if os.path.exists(bilstm_path):
                dl_bilstm = tf.keras.models.load_model(
                    bilstm_path,
                    custom_objects={"TemporalAttention": TemporalAttention}
                )
                logger.info("Loaded BiLSTM Attention Degradation model.")
            if os.path.exists(tft_path):
                dl_tft = tf.keras.models.load_model(
                    tft_path,
                    custom_objects={"PositionalEncoding": PositionalEncoding, "GatedResidualBlock": GatedResidualBlock}
                )
                logger.info("Loaded Temporal Fusion Transformer RUL model.")

            scaler_path = os.path.join(SAVED_MODELS_DIR, "sensor_scaler.joblib")
            if os.path.exists(scaler_path):
                sensor_scaler = joblib.load(scaler_path)
            rul_sc_path = os.path.join(SAVED_MODELS_DIR, "rul_scaler.joblib")
            if os.path.exists(rul_sc_path):
                rul_scaler = joblib.load(rul_sc_path)

            metrics_path = os.path.join(SAVED_MODELS_DIR, "evaluation_metrics.json")
            if os.path.exists(metrics_path):
                with open(metrics_path, "r") as f:
                    dl_metrics = json.load(f)
                    anomaly_threshold = dl_metrics.get("anomaly_detection", {}).get("threshold", 0.207359)
                logger.info(f"Loaded DL evaluation metrics. Anomaly threshold: {anomaly_threshold}")

        except Exception as e:
            logger.error(f"Error loading Deep Learning models: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    load_all_models()
    yield
    # Shutdown
    telemetry_buffer.clear()


app = FastAPI(title="AeroTwin Digital Twin GCS Backend", lifespan=lifespan)

# CORS configuration
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
ALLOW_ORIGINS = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health check endpoint confirming API and model readiness."""
    return {
        "status": "ok",
        "legacy_model_loaded": legacy_model is not None,
        "dl_models": {
            "lstm_autoencoder": dl_autoencoder is not None,
            "fault_1d_cnn": dl_cnn is not None,
            "degradation_bilstm": dl_bilstm is not None,
            "rul_transformer": dl_tft is not None
        }
    }


@app.get("/api/dl/models-info")
def get_dl_models_info():
    """Returns technical architecture metrics, test scores, and training times for all 4 models."""
    return {
        "models": dl_metrics,
        "classes": FAULT_CLASSES,
        "sensor_features": SENSOR_FEATURES,
        "anomaly_threshold": anomaly_threshold,
        "status": "online" if dl_cnn is not None else "standby"
    }


@app.post("/api/diagnose", response_model=DiagnosisResponse)
def diagnose_engine(params: EngineParameters):
    """Legacy diagnostic endpoint using RandomForest / heuristics."""
    features = [
        "rpm", "cht", "egt", "oil_pressure", "oil_temp", 
        "fuel_flow", "map", "vibration", "voltage", 
        "altitude", "ambient_temp", "afr"
    ]
    norm_dict = params.get_normalized_dict()
    # If legacy model loaded, predict
    if legacy_model is not None:
        X_sample = pd.DataFrame([norm_dict])[features]
        probabilities = legacy_model.predict_proba(X_sample)[0]
        prediction = legacy_model.predict(X_sample)[0]
        pred_idx = legacy_model_classes.index(prediction)
        confidence = float(probabilities[pred_idx])
    else:
        prediction = "Healthy"
        confidence = 0.95

    reliability = calculate_reliability(norm_dict)
    reasoning = []
    recommended_action = "Advisory: System nominal. No pilot action necessary."
    status = "Healthy"
    fault_component = "None"

    if prediction == "Healthy":
        status = "Healthy"
        fault_component = "Propulsion Core"
        reasoning.append("All primary and secondary sensors reporting inside nominal bands.")
    elif prediction == "Overheating":
        status = "Critical" if norm_dict["cht"] > 132 or norm_dict["oil_temp"] > 118 else "Warning"
        fault_component = "Cylinder Assembly / Liquid Jacket"
        reasoning.append(f"Cylinder Head Temp is elevated at {norm_dict['cht']:.1f}°C")
        recommended_action = "Reduce throttle to 75%. Enrich mixture (Auto/Rich). Initiate controlled descent."
    elif prediction == "Oil Starvation":
        status = "Critical"
        fault_component = "Oil Pump & Sump Circuit"
        reasoning.append(f"Oil Pressure critically low: {norm_dict['oil_pressure']*100:.0f} kPa")
        recommended_action = "CRITICAL: Engine seizure hazard. Reduce throttle, return to base immediately."
    elif prediction == "Bearing Wear":
        status = "Warning"
        fault_component = "Crankshaft & Main Journal Bearings"
        reasoning.append(f"Vibration level elevated at {norm_dict['vibration_rms']:.2f} g")
        recommended_action = "Avoid rapid throttle transients. Inspect bearings post-flight."
    elif prediction == "Fuel-Lean Misfire":
        status = "Warning"
        fault_component = "Fuel Injection Rail (EFI)"
        reasoning.append(f"Air-Fuel Ratio runs lean at {norm_dict['afr']:.1f}")
        recommended_action = "Set fuel mixture channel to RICH. Check injector rail pressure."

    m_score = calculate_maintenance_score(norm_dict)
    rul = calculate_rul(reliability, confidence)
    fail_prob = calculate_failure_probability(reliability, confidence)

    return DiagnosisResponse(
        status=status,
        fault_component=fault_component,
        fault_type=prediction,
        confidence=round(confidence, 2),
        mission_reliability_score=reliability,
        rul_estimate_hours=rul,
        failure_probability_30d=fail_prob,
        maintenance_score=m_score,
        reasoning=reasoning,
        recommended_action=recommended_action
    )


@app.post("/api/dl/diagnose", response_model=DLDiagnosisResponse)
def diagnose_dl_engine(params: EngineParameters):
    """
    Advanced Deep Learning Diagnostic Endpoint:
    Simultaneously executes all 4 neural models over the temporal sliding window:
    1. LSTM Autoencoder: Unsupervised anomaly reconstruction score.
    2. 1D CNN: Multi-harmonic 8-class fault identification.
    3. BiLSTM + Attention: Latent degradation index tracking [0-1].
    4. Temporal Fusion Transformer: Remaining Useful Life (RUL) prediction in hours.
    """
    norm_dict = params.get_normalized_dict()
    telemetry_buffer.append(norm_dict)

    # Build sequence window of length 32
    raw_window = list(telemetry_buffer)
    while len(raw_window) < 32:
        # Pad with initial sample if buffer not full yet
        raw_window.insert(0, raw_window[0])

    df_window = pd.DataFrame(raw_window)

    # Fallbacks if models not loaded
    fault_type = "NORMAL"
    confidence = 0.95
    fault_probs = {c: (0.95 if c == "NORMAL" else 0.05 / 7) for c in FAULT_CLASSES}
    anomaly_err = 0.08
    anomaly_detected = False
    deg_index = 0.05
    rul_hours = 240.0

    # 1. Anomaly Detection: LSTM Autoencoder
    if dl_autoencoder is not None and sensor_scaler is not None:
        try:
            X_scaled = sensor_scaler.transform(df_window[SENSOR_FEATURES])
            X_seq = np.expand_dims(X_scaled, axis=0) # shape (1, 32, 16)
            X_pred = dl_autoencoder.predict(X_seq, verbose=0)
            anomaly_err = float(np.mean(np.square(X_seq - X_pred)))
            anomaly_detected = anomaly_err > anomaly_threshold
        except Exception as e:
            logger.warning(f"Autoencoder inference warning: {e}")

    # 2. Fault Identification: 1D CNN
    if dl_cnn is not None and sensor_scaler is not None:
        try:
            X_scaled = sensor_scaler.transform(df_window[SENSOR_FEATURES])
            X_seq = np.expand_dims(X_scaled, axis=0)
            probs = dl_cnn.predict(X_seq, verbose=0)[0]
            top_idx = int(np.argmax(probs))
            fault_type = FAULT_CLASSES[top_idx]
            confidence = float(probs[top_idx])
            fault_probs = {FAULT_CLASSES[i]: float(probs[i]) for i in range(len(FAULT_CLASSES))}
        except Exception as e:
            logger.warning(f"1D CNN inference warning: {e}")

    # 3. Degradation Prediction: BiLSTM + Attention
    if dl_bilstm is not None and sensor_scaler is not None:
        try:
            X_scaled = sensor_scaler.transform(df_window[SENSOR_FEATURES])
            X_seq = np.expand_dims(X_scaled, axis=0)
            deg_pred = dl_bilstm.predict(X_seq, verbose=0)[0][0]
            deg_index = float(np.clip(deg_pred, 0.0, 1.0))
        except Exception as e:
            logger.warning(f"BiLSTM inference warning: {e}")

    # 4. RUL Prediction: Temporal Fusion Transformer
    if dl_tft is not None and rul_scaler is not None:
        try:
            X_rul_scaled = rul_scaler.transform(df_window[RUL_FEATURES])
            X_rul_seq = np.expand_dims(X_rul_scaled, axis=0) # shape (1, 32, 15)
            rul_pred = dl_tft.predict(X_rul_seq, verbose=0)[0][0]
            rul_hours = float(max(0.0, rul_pred))
        except Exception as e:
            logger.warning(f"TFT inference warning: {e}")

    health_score = int(round((1.0 - deg_index) * 100))

    # Determine status & reasoning across all 8 classes
    status = "Healthy"
    fault_component = "None"
    reasoning = []
    recommended_action = "Advisory: Propulsion system operating within nominal bounds."

    if fault_type == "NORMAL":
        status = "Healthy" if not anomaly_detected else "Warning"
        fault_component = "Propulsion Core"
        if anomaly_detected:
            reasoning.append(f"Autoencoder detected subtle out-of-distribution drift (Error: {anomaly_err:.4f} > Threshold: {anomaly_threshold:.4f})")
            recommended_action = "Monitor telemetry closely. Check sensor calibration post-flight."
        else:
            reasoning.append("All 16 telemetry parameters track nominal physical equilibrium.")

    elif fault_type == "BEARING_DEGRADATION":
        status = "Critical" if norm_dict["vibration_rms"] > 2.2 or norm_dict["vibration_peak"] > 5.0 else "Warning"
        fault_component = "Crankshaft Main Bearing Assembly"
        reasoning.append(f"Impulsive bearing raceway spalling detected: Vibration Peak at {norm_dict['vibration_peak']:.2f} g, RMS {norm_dict['vibration_rms']:.2f} g")
        reasoning.append(f"Elevated crest factor ({norm_dict['vibration_peak']/max(0.1, norm_dict['vibration_rms']):.2f}) indicates impact friction")
        recommended_action = "Maintain engine speed away from resonance bands (4200-4500 RPM). Inspect main bearings post-flight."

    elif fault_type == "PROPELLER_IMBALANCE":
        status = "Warning"
        fault_component = "Propeller & Rotor Hub"
        reasoning.append(f"Order-1 rotational vibration dominant: 1X amplitude is {norm_dict['vibration_1x']:.2f} g")
        reasoning.append("Centrifugal mass asymmetry detected without high-frequency impact harmonics")
        recommended_action = "Inspect propeller blades for nicking, leading edge erosion, or pitch imbalance."

    elif fault_type == "ENGINE_MISFIRE":
        status = "Critical" if confidence > 0.85 else "Warning"
        fault_component = "Ignition / Fuel Injection (EFI)"
        reasoning.append(f"Intermittent combustion torque deficits detected with EGT perturbation ({norm_dict['egt']:.0f}°C)")
        reasoning.append("Torsional cycle-to-cycle vibration coupled with fuel flow fluctuation")
        recommended_action = "Enrich fuel mixture (Auto/Rich). If roughness persists, reduce throttle and land at nearest field."

    elif fault_type == "LOW_OIL_PRESSURE":
        status = "Critical"
        fault_component = "Oil Pump & Sump Circuit"
        reasoning.append(f"Oil pressure deficit: {norm_dict['oil_pressure']:.2f} bar below speed-dependent expectation")
        reasoning.append(f"Trailing oil temperature elevated at {norm_dict['oil_temperature']:.1f}°C")
        recommended_action = "CRITICAL: Imminent boundary lubrication failure. Reduce power to minimum flight speed, RTB immediately."

    elif fault_type == "OVERHEATING":
        status = "Critical" if norm_dict["cht"] > 135 or norm_dict["oil_temperature"] > 120 else "Warning"
        fault_component = "Combustion Thermal Management"
        reasoning.append(f"Excess combustion heat: CHT at {norm_dict['cht']:.1f}°C and EGT at {norm_dict['egt']:.1f}°C")
        recommended_action = "Reduce throttle to 70%. Enrich air-fuel mixture. Lower cruise altitude for cooler airflow."

    elif fault_type == "COOLING_SYSTEM_FAILURE":
        status = "Critical"
        fault_component = "Liquid Cooling Circuit & Heat Exchanger"
        reasoning.append(f"Cooling dissipation loss: CHT elevated to {norm_dict['cht']:.1f}°C while combustion EGT remains normal")
        reasoning.append("Prolonged thermal decay constant observed — ram-air ducting or coolant circulation restricted")
        recommended_action = "Increase airspeed to maximize ram airflow. Avoid climb maneuvers. Vector to emergency landing."

    elif fault_type == "SENSOR_ANOMALY":
        status = "Warning"
        fault_component = "Telemetry Sensor Signal Chain"
        reasoning.append("Cross-channel physical inconsistency: Sensor output diverges from thermodynamic equilibrium")
        reasoning.append("Channel bias, drift, or stuck-at value detected without physical engine degradation")
        recommended_action = "Verify redundant sensor channels. Switch to secondary telemetry bus."

    return DLDiagnosisResponse(
        status=status,
        fault_type=fault_type,
        confidence=round(confidence, 4),
        fault_probabilities=fault_probs,
        anomaly_detected=bool(anomaly_detected),
        anomaly_reconstruction_error=round(anomaly_err, 6),
        anomaly_threshold=round(anomaly_threshold, 6),
        degradation_index=round(deg_index, 4),
        health_score=health_score,
        rul_estimate_hours=round(rul_hours, 2),
        fault_component=fault_component,
        reasoning=reasoning,
        recommended_action=recommended_action
    )


# WebSocket simulation state machine
SIM_TARGETS = {
    "nominal": {
        "rpm": 4800.0, "cht": 110.0, "egt": 810.0, "oil_pressure": 380.0, "oil_temp": 92.0,
        "fuel_flow": 18.5, "map": 101.0, "vibration": 1.1, "voltage": 14.2, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 14.7, "throttle": 0.75, "engine_load": 0.65
    },
    "overheating": {
        "rpm": 5200.0, "cht": 138.0, "egt": 895.0, "oil_pressure": 350.0, "oil_temp": 114.0,
        "fuel_flow": 21.0, "map": 105.0, "vibration": 1.25, "voltage": 14.1, "altitude": 3500.0,
        "ambient_temp": 10.0, "afr": 14.8, "throttle": 0.85, "engine_load": 0.82
    },
    "oil_starvation": {
        "rpm": 4700.0, "cht": 122.0, "egt": 820.0, "oil_pressure": 175.0, "oil_temp": 126.0,
        "fuel_flow": 18.0, "map": 100.0, "vibration": 1.8, "voltage": 14.0, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 14.7, "throttle": 0.70, "engine_load": 0.70
    },
    "bearing_wear": {
        "rpm": 4600.0, "cht": 115.0, "egt": 810.0, "oil_pressure": 360.0, "oil_temp": 108.0,
        "fuel_flow": 17.5, "map": 99.0, "vibration": 3.2, "voltage": 13.8, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 14.7, "throttle": 0.72, "engine_load": 0.68
    },
    "lean_misfire": {
        "rpm": 4400.0, "cht": 112.0, "egt": 865.0, "oil_pressure": 360.0, "oil_temp": 95.0,
        "fuel_flow": 13.2, "map": 95.0, "vibration": 1.6, "voltage": 14.0, "altitude": 2500.0,
        "ambient_temp": 15.0, "afr": 16.8, "throttle": 0.68, "engine_load": 0.60
    },
    "random": None
}


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    logger.info("GCS Frontend connected via WebSocket.")
    current_state = "nominal"
    curr_vals = dict(SIM_TARGETS["nominal"])

    try:
        while True:
            try:
                data_str = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                data = json.loads(data_str)
                if "preset" in data:
                    preset = data["preset"]
                    if preset == "random":
                        current_state = "nominal"
                        base = dict(SIM_TARGETS["nominal"])
                        keys = list(base.keys())
                        random.shuffle(keys)
                        for k in keys[:4]:
                            base[k] *= random.uniform(0.70, 1.35)
                        curr_vals = base
                    elif preset in SIM_TARGETS and SIM_TARGETS[preset] is not None:
                        current_state = preset
                if "manual_adjust" in data:
                    for k, v in data["manual_adjust"].items():
                        if k in curr_vals:
                            curr_vals[k] = float(v)
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                logger.warning(f"Error parsing websocket message: {e}")

            target_vals = SIM_TARGETS.get(current_state)
            for key in curr_vals:
                if target_vals and key in target_vals:
                    curr_vals[key] += (target_vals[key] - curr_vals[key]) * 0.1
                noise_scales = {
                    "rpm": 12, "cht": 0.3, "egt": 1.2, "oil_pressure": 1.2, "oil_temp": 0.25,
                    "fuel_flow": 0.06, "map": 0.20, "vibration": 0.02, "voltage": 0.02,
                    "altitude": 1.5, "ambient_temp": 0.1, "afr": 0.02
                }
                scale = noise_scales.get(key, 0.05)
                curr_vals[key] += random.normalvariate(0, scale)

            curr_vals["rpm"] = max(1000, curr_vals["rpm"])
            curr_vals["cht"] = max(40, curr_vals["cht"])
            curr_vals["vibration"] = max(0.05, curr_vals["vibration"])

            # Send telemetry frame
            await websocket.send_text(json.dumps({
                "telemetry": curr_vals,
                "preset": current_state
            }))
            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        logger.info("GCS Frontend disconnected.")
    except Exception as e:
        logger.error(f"WebSocket telemetry error: {e}")
