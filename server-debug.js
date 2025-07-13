const express = require("express");
const path = require("path");

console.log('Starting A2Z Chat server...');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

console.log('Middleware configured...');

// Import API handler
const apiHandler = require('./api/socket.js');
console.log('API handler imported...');

// API routes
app.use('/api', (req, res) => {
  console.log(`API request: ${req.method} ${req.url}`);
  apiHandler(req, res);
});

// Serve static files
app.get('/', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get("/health", (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    app: "A2Z Chat"
  });
});

// Catch all route for client-side routing
app.get('*', (req, res) => {
  console.log(`Catch-all route: ${req.url}`);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('Routes configured...');

// Start server
app.listen(PORT, () => {
  console.log(`🚀 A2Z Chat server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to start chatting!`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
