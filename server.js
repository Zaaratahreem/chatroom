const express = require("express");
const path = require("path");
const { createServer } = require("http");

const app = express();
const server = createServer(app);

// Configure Socket.IO
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket']
});

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, "public")));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO connection handling
io.on("connection", function(socket) {
  console.log("User connected:", socket.id);
  
  socket.on("newuser", function(username) {
    socket.broadcast.emit("update", username + " joined the conversation");
  });
  
  socket.on("exituser", function(username) {
    socket.broadcast.emit("update", username + " left the conversation");
  });
  
  socket.on("chat", function(message) {
    socket.broadcast.emit("chat", message);
  });
  
  socket.on("disconnect", function() {
    console.log("User disconnected:", socket.id);
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Use environment port or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});

module.exports = app;
