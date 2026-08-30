from pydantic import BaseModel, Field
from typing import List, Optional

class EngineParameters(BaseModel):
    rpm: float = Field(..., description="Engine speed in RPM", ge=1000, le=6000)
    cht: float = Field(..., description="Cylinder Head Temperature in °C", ge=40, le=160)
    egt: float = Field(..., description="Exhaust Gas Temperature in °C", ge=300, le=1000)
    oil_pressure: float = Field(..., description="Oil Pressure in kPa", ge=20, le=600)
    oil_temp: float = Field(..., description="Oil Temperature in °C", ge=20, le=150)
    fuel_flow: float = Field(..., description="Fuel Flow in L/h", ge=1, le=40)
    map: float = Field(..., description="Manifold Absolute Pressure in kPa", ge=20, le=150)
    vibration: float = Field(..., description="Vibration Level in g (RMS)", ge=0.05, le=6.0)
    voltage: float = Field(..., description="Ignition Voltage in V", ge=8.0, le=18.0)
    altitude: float = Field(..., description="Flight Altitude in meters", ge=0, le=8000)
    ambient_temp: float = Field(..., description="Ambient air temperature in °C", ge=-50, le=60)
    afr: float = Field(..., description="Air-Fuel Ratio", ge=8.0, le=22.0)

class DiagnosisResponse(BaseModel):
    status: str = Field(..., description="Engine Health Status: Healthy, Warning, Critical")
    fault_component: str = Field(..., description="Likely faulty component")
    fault_type: str = Field(..., description="Specific fault class classification")
    confidence: float = Field(..., description="Model classification probability score")
    mission_reliability_score: int = Field(..., description="Remaining mission reliability index (0-100)")
    reasoning: List[str] = Field(..., description="Rule-based logical explainability steps")
    recommended_action: str = Field(..., description="Operational action suggested to pilot/operator")
