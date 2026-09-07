// Vercel Serverless Function: /api/telemetry
// Receives live telemetry from virtualengine.vercel.app and serves it to sihaimodel.vercel.app

let latestTelemetry = {
  timestamp: new Date().toISOString(),
  rpm: 4850.0,
  cht: 112.5,
  egt: 815.0,
  oil_pressure: 3.82,
  oil_temperature: 93.1,
  fuel_flow: 18.2,
  vibration: 1.15,
  flight_phase: "CRUISE",
  engine_on: true,
  status: "nominal"
};

let packetCount = 0;
let lastPacketTime = null;

export default async function handler(req, res) {
  // Set CORS headers so virtualengine.vercel.app can POST without any CORS issues
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      
      latestTelemetry = {
        ...latestTelemetry,
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
      packetCount++;
      lastPacketTime = new Date().toISOString();

      // Simple real-time rule health evaluation for Vercel edge
      const rpm = latestTelemetry.rpm || 4800;
      const cht = latestTelemetry.cht || 110;
      const isAnomaly = cht > 135 || rpm > 5600;

      return res.status(200).json({
        status: "ok",
        received: true,
        packets_received: packetCount,
        anomaly_detected: isAnomaly,
        message: "Telemetry ingested successfully into AeroTwin",
        timestamp: lastPacketTime
      });
    } catch (err) {
      return res.status(400).json({ status: "error", message: err.message });
    }
  }

  // GET: Return latest telemetry frame and stream status
  if (req.method === 'GET') {
    const isLive = lastPacketTime && (Date.now() - new Date(lastPacketTime).getTime()) < 15000;
    return res.status(200).json({
      status: "ok",
      stream_active: isLive,
      packets_received: packetCount,
      last_packet_time: lastPacketTime,
      telemetry: latestTelemetry
    });
  }

  res.status(405).json({ error: "Method not allowed" });
}
