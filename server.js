const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store sensor data and states
let sensorData = {
  temperature: { value: 23.5, unit: '°C', status: 'normal', lastUpdate: new Date() },
  humidity: { value: 45, unit: '%', status: 'normal', lastUpdate: new Date() },
  pressure: { value: 1013.25, unit: 'hPa', status: 'normal', lastUpdate: new Date() },
  light: { value: 750, unit: 'lux', status: 'normal', lastUpdate: new Date() },
  motion: { value: false, unit: 'detected', status: 'normal', lastUpdate: new Date() },
  airQuality: { value: 85, unit: 'AQI', status: 'good', lastUpdate: new Date() }
};

let deviceStates = {
  fan: { state: false, speed: 0 },
  lights: { state: false, brightness: 100 },
  ac: { state: false, temperature: 22 },
  alarm: { state: false, volume: 50 },
  ventilation: { state: false, speed: 0 }
};

let alerts = [];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/sensors', (req, res) => {
  res.json(sensorData);
});

app.get('/api/devices', (req, res) => {
  res.json(deviceStates);
});

app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

// Webhook endpoint for sensor data
app.post('/api/webhook/sensor', (req, res) => {
  const { sensorType, value, unit, timestamp } = req.body;
  
  if (sensorData[sensorType]) {
    sensorData[sensorType] = {
      ...sensorData[sensorType],
      value: parseFloat(value),
      unit: unit || sensorData[sensorType].unit,
      lastUpdate: new Date(timestamp || Date.now())
    };
    
    // Check for alerts
    checkAlerts(sensorType, value);
    
    // Broadcast to all connected clients
    io.emit('sensorUpdate', { sensorType, data: sensorData[sensorType] });
    
    res.json({ success: true, message: 'Sensor data updated' });
  } else {
    res.status(400).json({ success: false, message: 'Unknown sensor type' });
  }
});

// Device control endpoint
app.post('/api/control/:device', (req, res) => {
  const device = req.params.device;
  const { action, value } = req.body;
  
  if (deviceStates[device]) {
    switch (action) {
      case 'toggle':
        deviceStates[device].state = !deviceStates[device].state;
        break;
      case 'set':
        Object.assign(deviceStates[device], value);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    // Broadcast device state change
    io.emit('deviceUpdate', { device, state: deviceStates[device] });
    
    // Log the control action
    console.log(`Device ${device} controlled: ${JSON.stringify(deviceStates[device])}`);
    
    res.json({ success: true, device, state: deviceStates[device] });
  } else {
    res.status(404).json({ success: false, message: 'Device not found' });
  }
});

// Function to check for alerts
function checkAlerts(sensorType, value) {
  const thresholds = {
    temperature: { min: 15, max: 30 },
    humidity: { min: 30, max: 70 },
    pressure: { min: 1000, max: 1030 },
    airQuality: { min: 0, max: 100 }
  };
  
  if (thresholds[sensorType]) {
    const threshold = thresholds[sensorType];
    if (value < threshold.min || value > threshold.max) {
      const alert = {
        id: uuidv4(),
        type: 'warning',
        sensor: sensorType,
        value: value,
        message: `${sensorType} is out of normal range: ${value}`,
        timestamp: new Date()
      };
      
      alerts.unshift(alert);
      // Keep only last 50 alerts
      if (alerts.length > 50) alerts = alerts.slice(0, 50);
      
      io.emit('alert', alert);
    }
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current data to new client
  socket.emit('initialData', {
    sensors: sensorData,
    devices: deviceStates,
    alerts: alerts.slice(0, 10)
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('requestControl', (data) => {
    const { device, action, value } = data;
    if (deviceStates[device]) {
      // Process control request
      switch (action) {
        case 'toggle':
          deviceStates[device].state = !deviceStates[device].state;
          break;
        case 'set':
          Object.assign(deviceStates[device], value);
          break;
      }
      
      // Broadcast to all clients
      io.emit('deviceUpdate', { device, state: deviceStates[device] });
    }
  });
});

// Simulate sensor data updates (remove this in production)
setInterval(() => {
  // Simulate temperature fluctuations
  sensorData.temperature.value = 20 + Math.random() * 15;
  sensorData.humidity.value = 30 + Math.random() * 40;
  sensorData.pressure.value = 1000 + Math.random() * 50;
  sensorData.light.value = Math.random() * 1000;
  sensorData.motion.value = Math.random() > 0.8;
  sensorData.airQuality.value = 50 + Math.random() * 50;
  
  Object.keys(sensorData).forEach(key => {
    sensorData[key].lastUpdate = new Date();
    checkAlerts(key, sensorData[key].value);
  });
  
  // Broadcast updates
  io.emit('sensorData', sensorData);
}, 5000);

server.listen(PORT, () => {
  console.log(`Sensor Monitoring Portal running on port ${PORT}`);
  console.log(`Access the dashboard at: http://localhost:${PORT}`);
});