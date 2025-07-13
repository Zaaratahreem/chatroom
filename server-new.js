const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Import API routes
const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString(), app: "A2Z Chat" });
});

// Start server
app.listen(PORT, () => {
  console.log(`A2Z Chat server running on http://localhost:${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});

module.exports = app;
