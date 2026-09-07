from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EngineParameters(BaseModel):
    rpm: float = Field(default=4800.0, description="Engine speed in RPM", ge=500, le=7000)
    cht: float = Field(default=110.0, description="Cylinder Head Temperature in °C", ge=20, le=200)
    egt: float = Field(default=810.0, description="Exhaust Gas Temperature in °C", ge=100, le=1200)
    oil_pressure: float = Field(default=380.0, description="Oil Pressure in kPa or bar", ge=0, le=800)
    oil_temp: Optional[float] = Field(default=None, description="Oil Temperature in °C")
    oil_temperature: Optional[float] = Field(default=None, description="Oil Temperature in °C")
    fuel_flow: float = Field(default=18.5, description="Fuel Flow in L/h", ge=0, le=50)
    map: Optional[float] = Field(default=101.0, description="Manifold Absolute Pressure in kPa")
    vibration: Optional[float] = Field(default=None, description="Vibration Level in g (RMS)")
    vibration_rms: Optional[float] = Field(default=None, description="Broadband RMS acceleration in g")
    vibration_peak: Optional[float] = Field(default=None, description="Peak acceleration in g")
    vibration_1x: Optional[float] = Field(default=None, description="1X harmonic vibration in g")
    vibration_2x: Optional[float] = Field(default=None, description="2X harmonic vibration in g")
    voltage: Optional[float] = Field(default=None, description="Bus/Ignition Voltage in V")
    battery_voltage: Optional[float] = Field(default=None, description="Battery bus voltage in V")
    alternator_voltage: Optional[float] = Field(default=None, description="Alternator voltage in V")
    altitude: Optional[float] = Field(default=2500.0, description="Flight Altitude in meters")
    ambient_temp: Optional[float] = Field(default=None, description="Ambient air temperature in °C")
    ambient_temperature: Optional[float] = Field(default=None, description="Ambient air temperature in °C")
    ambient_pressure: Optional[float] = Field(default=1013.25, description="Ambient pressure in hPa")
    throttle: Optional[float] = Field(default=0.75, description="Throttle position 0-1")
    engine_load: Optional[float] = Field(default=0.70, description="Normalized engine load 0-1")
    afr: Optional[float] = Field(default=14.7, description="Air-Fuel Ratio")
    engine_operating_hours: Optional[float] = Field(default=250.0, description="Cumulative engine operating hours")

    def get_normalized_dict(self) -> Dict[str, float]:
        """Normalizes field aliases between legacy frontend and 16-channel DL dataset."""
        ot = self.oil_temperature if self.oil_temperature is not None else (self.oil_temp if self.oil_temp is not None else 92.0)
        at = self.ambient_temperature if self.ambient_temperature is not None else (self.ambient_temp if self.ambient_temp is not None else 15.0)
        v_rms = self.vibration_rms if self.vibration_rms is not None else (self.vibration if self.vibration is not None else 1.1)
        v_peak = self.vibration_peak if self.vibration_peak is not None else v_rms * 1.414
        v_1x = self.vibration_1x if self.vibration_1x is not None else v_rms * 0.70
        v_2x = self.vibration_2x if self.vibration_2x is not None else v_rms * 0.25
        b_volt = self.battery_voltage if self.battery_voltage is not None else (self.voltage if self.voltage is not None else 14.2)
        alt_volt = self.alternator_voltage if self.alternator_voltage is not None else b_volt
        
        # Pressure scaling: if pressure is provided in kPa (>10), keep it or convert
        oil_p = self.oil_pressure
        # In files-2 dataset oil_pressure is in bar (nominal ~3.8 bar), legacy is kPa (~380 kPa)
        oil_p_bar = oil_p / 100.0 if oil_p > 15.0 else oil_p
        
        return {
            "rpm": float(self.rpm),
            "throttle": float(self.throttle if self.throttle is not None else 0.75),
            "engine_load": float(self.engine_load if self.engine_load is not None else 0.70),
            "oil_pressure": float(oil_p_bar),
            "oil_temperature": float(ot),
            "cht": float(self.cht),
            "egt": float(self.egt),
            "fuel_flow": float(self.fuel_flow),
            "vibration_rms": float(v_rms),
            "vibration_peak": float(v_peak),
            "vibration_1x": float(v_1x),
            "vibration_2x": float(v_2x),
            "battery_voltage": float(b_volt),
            "alternator_voltage": float(alt_volt),
            "ambient_temperature": float(at),
            "ambient_pressure": float(self.ambient_pressure if self.ambient_pressure is not None else 1013.25),
            "engine_operating_hours": float(self.engine_operating_hours if self.engine_operating_hours is not None else 250.0),
            # Legacy fields for backward compatibility
            "oil_temp": float(ot),
            "map": float(self.map if self.map is not None else 101.0),
            "vibration": float(v_rms),
            "voltage": float(b_volt),
            "altitude": float(self.altitude if self.altitude is not None else 2500.0),
            "ambient_temp": float(at),
            "afr": float(self.afr if self.afr is not None else 14.7)
        }

class DiagnosisResponse(BaseModel):
    status: str = Field(..., description="Engine Health Status: Healthy, Warning, Critical")
    fault_component: str = Field(..., description="Likely faulty component")
    fault_type: str = Field(..., description="Specific fault class classification")
    confidence: float = Field(..., description="Model classification probability score")
    mission_reliability_score: int = Field(..., description="Remaining mission reliability index (0-100)")
    rul_estimate_hours: int = Field(..., description="Remaining useful life in flight hours")
    failure_probability_30d: float = Field(..., description="Failure probability over next 30 days (%)")
    maintenance_score: int = Field(..., description="Maintenance health score 0-100")
    reasoning: List[str] = Field(..., description="Rule-based logical explainability steps")
    recommended_action: str = Field(..., description="Operational action suggested to pilot/operator")

class DLDiagnosisResponse(BaseModel):
    status: str = Field(..., description="Engine Health Status: Healthy, Warning, Critical")
    fault_type: str = Field(..., description="Predicted 8-class fault category")
    confidence: float = Field(..., description="1D CNN top-class prediction confidence (0-1)")
    fault_probabilities: Dict[str, float] = Field(..., description="Probability distribution across all 8 classes")
    anomaly_detected: bool = Field(..., description="LSTM Autoencoder anomaly threshold flag")
    anomaly_reconstruction_error: float = Field(..., description="Autoencoder Mean Squared Reconstruction Error")
    anomaly_threshold: float = Field(..., description="Anomaly decision threshold")
    degradation_index: float = Field(..., description="BiLSTM+Attention latent degradation index (0-1)")
    health_score: int = Field(..., description="Engine overall health index (0-100)")
    rul_estimate_hours: float = Field(..., description="Temporal Fusion Transformer predicted RUL in hours")
    fault_component: str = Field(..., description="Attributed subsystem")
    reasoning: List[str] = Field(..., description="Temporal physical evidence and symptoms")
    recommended_action: str = Field(..., description="Prescribed operational action")
