const { Server } = require('socket.io');
const express = require('express');
const { createServer } = require('http');
const path = require('path');

let io;
let httpServer;

function initializeServer() {
  if (!httpServer) {
    const app = express();
    httpServer = createServer(app);
    
    // Configure Socket.IO with polling transport for Vercel compatibility
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['polling'],
      allowEIO3: true
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      socket.on('newuser', (username) => {
        socket.broadcast.emit('update', username + ' joined the conversation');
      });
      
      socket.on('exituser', (username) => {
        socket.broadcast.emit('update', username + ' left the conversation');
      });
      
      socket.on('chat', (message) => {
        socket.broadcast.emit('chat', message);
      });
      
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }
  return { io, httpServer };
}

module.exports = (req, res) => {
  // Initialize server on first request
  const { io: socketIO } = initializeServer();
  
  // Handle Socket.IO requests
  if (req.url.startsWith('/socket.io/')) {
    return socketIO.engine.handleRequest(req, res);
  }
  
  // Health check
  if (req.url === '/health' || req.url === '/api/health') {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      transport: 'polling'
    });
    return;
  }
  
  // Default response
  res.status(200).json({ 
    message: 'Socket.IO server running',
    endpoint: '/socket.io/'
  });
};
