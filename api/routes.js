const express = require('express');
const router = express.Router();

// A2Z Chat - Production Ready Room-based Chat Server
let rooms = new Map(); // Store messages and users by room
let serverStats = {
  startTime: Date.now(),
  totalConnections: 0,
  messagesProcessed: 0
};

// Get or create room
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    console.log(`Creating new room: ${roomId}`);
    rooms.set(roomId, {
      messages: [],
      users: new Set(),
      created: Date.now(),
      lastActivity: Date.now()
    });
  }
  
  const room = rooms.get(roomId);
  room.lastActivity = Date.now();
  return room;
}

// Clean up old messages in a room (keep last 100)
function cleanupRoomMessages(room) {
  if (room.messages.length > 100) {
    room.messages = room.messages.slice(-100);
    console.log('Cleaned up old messages in room');
  }
}

// Clean up empty rooms older than 2 hours
function cleanupEmptyRooms() {
  const twoHours = 2 * 60 * 60 * 1000;
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [roomId, room] of rooms.entries()) {
    const isOld = (now - room.lastActivity) > twoHours;
    const isEmpty = room.users.size === 0;
    
    if (isEmpty && isOld) {
      rooms.delete(roomId);
      cleanedCount++;
      console.log(`Cleaned up empty room: ${roomId}`);
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} empty rooms`);
  }
}

// Validate input data
function validateInput(data, requiredFields) {
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || !data[field].trim()) {
      return `${field} is required and must be a non-empty string`;
    }
  }
  
  // Additional validations
  if (data.name && data.name.length > 20) {
    return 'Name must be 20 characters or less';
  }
  
  if (data.message && data.message.length > 500) {
    return 'Message must be 500 characters or less';
  }
  
  if (data.room && !/^[A-Z0-9]{6}$/.test(data.room)) {
    return 'Room ID must be 6 alphanumeric characters';
  }
  
  return null;
}

// Middleware for CORS and logging
router.use((req, res, next) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Logging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Clean up empty rooms periodically (every 10th request)
  if (Math.random() < 0.1) {
    cleanupEmptyRooms();
  }
  
  next();
});

// Error handler middleware
function handleError(res, error, context = '') {
  console.error(`Error in ${context}:`, error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}

// Join a room
router.post('/join', (req, res) => {
  try {
    const validation = validateInput(req.body, ['name', 'room']);
    if (validation) {
      return res.status(400).json({ success: false, message: validation });
    }
    
    const { name, room } = req.body;
    const roomData = getRoom(room.toUpperCase());
    
    // Check if user is already in room
    if (roomData.users.has(name)) {
      console.log(`User ${name} already in room ${room}`);
      return res.status(200).json({ success: true, message: 'Already in room' });
    }
    
    roomData.users.add(name);
    roomData.messages.push({
      type: 'update',
      text: `${name} joined the chat`,
      timestamp: Date.now()
    });
    
    cleanupRoomMessages(roomData);
    serverStats.totalConnections++;
    
    console.log(`User ${name} joined room ${room} (${roomData.users.size} users total)`);
    res.status(200).json({ success: true });
    
  } catch (error) {
    handleError(res, error, 'join');
  }
});

// Leave a room
router.post('/leave', (req, res) => {
  try {
    const validation = validateInput(req.body, ['name', 'room']);
    if (validation) {
      return res.status(400).json({ success: false, message: validation });
    }
    
    const { name, room } = req.body;
    const roomData = getRoom(room.toUpperCase());
    
    if (roomData.users.has(name)) {
      roomData.users.delete(name);
      roomData.messages.push({
        type: 'update',
        text: `${name} left the chat`,
        timestamp: Date.now()
      });
      
      cleanupRoomMessages(roomData);
      console.log(`User ${name} left room ${room} (${roomData.users.size} users remaining)`);
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    handleError(res, error, 'leave');
  }
});

// Send a message
router.post('/message', (req, res) => {
  try {
    const validation = validateInput(req.body, ['name', 'message', 'room']);
    if (validation) {
      return res.status(400).json({ success: false, message: validation });
    }
    
    const { name, message, room } = req.body;
    const roomData = getRoom(room.toUpperCase());
    
    // Check if user is in the room
    if (!roomData.users.has(name)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must join the room before sending messages' 
      });
    }
    
    roomData.messages.push({
      type: 'chat',
      name,
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    });
    
    cleanupRoomMessages(roomData);
    serverStats.messagesProcessed++;
    
    console.log(`Message from ${name} in room ${room}: "${message}"`);
    res.status(200).json({ success: true });
    
  } catch (error) {
    handleError(res, error, 'message');
  }
});

// Get messages (polling endpoint)
router.get('/messages', (req, res) => {
  try {
    const room = req.query.room;
    const since = parseInt(req.query.since) || 0;
    
    if (!room) {
      return res.status(400).json({ success: false, message: 'Room parameter is required' });
    }
    
    if (!/^[A-Z0-9]{6}$/.test(room)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID format' });
    }
    
    const roomData = getRoom(room);
    const newMessages = roomData.messages.filter(msg => msg.timestamp > since);
    
    // Only log if there are new messages to avoid spam
    if (newMessages.length > 0) {
      console.log(`Sending ${newMessages.length} new messages to room ${room}`);
    }
    
    res.status(200).json({ 
      success: true,
      messages: newMessages,
      timestamp: Date.now(),
      userCount: roomData.users.size
    });
    
  } catch (error) {
    handleError(res, error, 'messages');
  }
});

// Get room statistics
router.get('/rooms', (req, res) => {
  try {
    const roomStats = Array.from(rooms.entries()).map(([roomId, room]) => ({
      roomId,
      userCount: room.users.size,
      messageCount: room.messages.length,
      created: room.created,
      lastActivity: room.lastActivity
    }));
    
    res.status(200).json({ 
      success: true,
      rooms: roomStats,
      totalRooms: rooms.size,
      serverStats
    });
    
  } catch (error) {
    handleError(res, error, 'rooms');
  }
});

// Health check with detailed info
router.get('/health', (req, res) => {
  try {
    const totalUsers = Array.from(rooms.values()).reduce((sum, room) => sum + room.users.size, 0);
    const totalMessages = Array.from(rooms.values()).reduce((sum, room) => sum + room.messages.length, 0);
    const uptime = Date.now() - serverStats.startTime;
    
    const healthData = { 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      app: 'A2Z Chat',
      version: '2.0.0',
      uptime: Math.floor(uptime / 1000), // seconds
      stats: {
        totalRooms: rooms.size,
        totalUsers,
        totalMessages,
        totalConnections: serverStats.totalConnections,
        messagesProcessed: serverStats.messagesProcessed
      },
      memory: process.memoryUsage()
    };
    
    res.status(200).json(healthData);
    
  } catch (error) {
    handleError(res, error, 'health');
  }
});

// Debug endpoint (only in development)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug', (req, res) => {
    try {
      const roomsData = Array.from(rooms.entries()).map(([roomId, room]) => ({
        roomId,
        users: Array.from(room.users),
        messageCount: room.messages.length,
        recentMessages: room.messages.slice(-5),
        created: new Date(room.created).toISOString(),
        lastActivity: new Date(room.lastActivity).toISOString()
      }));
      
      res.status(200).json({
        success: true,
        rooms: roomsData,
        serverStats,
        memoryUsage: process.memoryUsage()
      });
    } catch (error) {
      handleError(res, error, 'debug');
    }
  });
}

// Catch-all for undefined endpoints
router.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    availableEndpoints: ['/join', '/leave', '/message', '/messages', '/rooms', '/health']
  });
});

// Periodic cleanup interval (every 30 minutes)
setInterval(() => {
  console.log('Running scheduled cleanup...');
  cleanupEmptyRooms();
}, 30 * 60 * 1000);

console.log('A2Z Chat API routes initialized');

module.exports = router;
