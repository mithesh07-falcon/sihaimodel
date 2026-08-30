# AeroTwin - AI-Enabled Digital Twin GCS Prototype

AeroTwin is an interactive digital twin ground control station (GCS) and diagnostic prototype for health monitoring, fault prediction, and mission reliability enhancement of MALE UAV propulsion systems.

This prototype uses a **React + Three.js (R3F)** frontend dashboard to interact with a **Python FastAPI + scikit-learn** Machine Learning classifier backend.

---

## ⚠️ Disclaimer

> [!WARNING]
> This software is an engineering **prototype**. All telemetry streams, parameters, classification outputs, and the 3D engine geometric visual model are entirely **simulated/generic for demonstration purposes**. They do not represent real MALE UAV telemetry feeds, flight certification boundaries, or actual intellectual property/geometries of any specific manufacturer's engine model.

---

## 🛠️ Project Architecture

```
DigitalTwin/
├── frontend/             # React + Vite + Three.js + Zustand + Tailwind GCS HUD
│   ├── src/
│   │   ├── components/   # 3D Engine Model, Parameter Sliders, Gauges, Trends
│   │   ├── store/        # Zustand global state coordinator
│   │   └── App.jsx
├── backend/              # FastAPI + scikit-learn Classifier
│   ├── app/
│   │   ├── main.py       # API endpoints & WebSocket Telemetry Streamer
│   │   ├── reliability.py# Bayesian parameter deviation metrics
│   │   └── model/        # Training script, generator, and serialized RF model
└── start.bat             # Startup script for simultaneous local run
```

---

## 🚀 Installation & Local Run

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### One-Command Launcher (Windows)
Double-click the **`start.bat`** file in the root directory to spin up the FastAPI server and the Vite development console in separate command prompt processes.

### Manual Launch

#### 1. Start ML Backend
Navigate to the root directory and install dependencies:
```bash
pip install -r backend/requirements.txt
```
To run the server:
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 3000 --reload
```
*Note: On startup, the backend automatically performs a self-healing check. If the model (`engine_model.joblib`) is missing, it will generate a synthetic 5,000-row telemetry dataset and train the RandomForest model dynamically.*

#### 2. Start Frontend HUD
Navigate to the `frontend/` folder and install packages:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 📖 Presentation Narration Guide (3-Minute Demo)

Use this structure when showcasing the AeroTwin prototype:

1. **The Context (0:00 - 0:25)**:
   *"AeroTwin is a digital twin cockpit GCS that mirrors physical aero piston engines in software. It ingests sensor telemetry to predict component failures and mission reliability before they occur."*
2. **The HUD Overview (0:25 - 0:50)**:
   *"On the left sidebar, we monitor real-time receiver signals and flight heights. The main panel displays circular gauges, a scrolling trend line, and our 3D engine model revolving at idle RPM."*
3. **Simulating a Fault (0:50 - 1:30)**:
   *"Let's inject an Oil Starvation preset. The sliders instantly shift. Look at the 3D twin: the oil sump block flashes and glows red. In our AI diagnosis block, the Random Forest model re-evaluates the vectors to classify an active 'Oil Starvation' fault with high probability."*
4. **Explainability & Decision (1:30 - Close)**:
   *"We also show rule-based explainability details (e.g. oil pressure deviation) so operators understand why the decision was flagged. Our reliability index score drops to alert the operator to initiate glide-slope RTB (Return to Base)."*
