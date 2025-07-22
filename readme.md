# Company Sensor Monitoring Portal

A real-time web-based monitoring dashboard for sensors with device control capabilities.

## Features

- 🌡️ Real-time sensor monitoring (Temperature, Humidity, Pressure, Light, Motion, Air Quality)
- 🎛️ Device control panel (Fan, Lights, AC, Alarm, Ventilation)
- 📊 Live charts and data visualization
- 🚨 Alert system with notifications
- 📱 Responsive design for mobile and desktop
- 🔌 WebSocket support for real-time updates
- 🔗 Webhook endpoints for sensor integration

## File Structure

```
sensor-monitoring-portal/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env               # Environment variables
├── public/            # Static files
│   └── index.html     # Dashboard UI
└── README.md          # This file
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open browser and go to:
   ```
   http://localhost:3000
   ```

## API Endpoints

### Webhook for Sensor Data
```bash
POST /api/webhook/sensor
Content-Type: application/json

{
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "°C",
  "timestamp": "2025-07-22T10:30:00Z"
}
```

### Device Control
```bash
POST /api/control/:device
Content-Type: application/json

{
  "action": "toggle"
}
```

### Get Current Data
```bash
GET /api/sensors     # Get all sensor data
GET /api/devices     # Get all device states
GET /api/alerts      # Get recent alerts
```

## Sensor Types Supported

- `temperature` - Temperature in °C
- `humidity` - Humidity percentage
- `pressure` - Atmospheric pressure in hPa
- `light` - Light level in lux
- `motion` - Motion detection (boolean)
- `airQuality` - Air Quality Index

## Device Types Supported

- `fan` - Fan with speed control
- `lights` - Lights with brightness control
- `ac` - Air conditioning with temperature control
- `alarm` - Alarm system
- `ventilation` - Ventilation system

## Deployment on Render

Your app is successfully deployed at: **https://monitoring-portal.onrender.com**

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

## WebSocket Events

The dashboard uses Socket.IO for real-time communication:

- `sensorUpdate` - Individual sensor data update
- `sensorData` - All sensor data update
- `deviceUpdate` - Device state change
- `alert` - New alert notification
- `requestControl` - Device control request