const express = require('express');
const router = express.Router();

// A2Z Chat - Room-based polling chat server
let rooms = new Map(); // Store messages and users by room

// Get or create room
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      messages: [],
      users: new Set(),
      created: Date.now()
    });
  }
  return rooms.get(roomId);
}

// Clean up old messages in a room (keep last 100)
function cleanupRoomMessages(room) {
  if (room.messages.length > 100) {
    room.messages = room.messages.slice(-100);
  }
}

// Clean up empty rooms older than 1 hour
function cleanupEmptyRooms() {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();
  
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size === 0 && (now - room.created) > oneHour) {
      rooms.delete(roomId);
    }
  }
}

// Enable CORS for all routes
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Clean up empty rooms periodically
  cleanupEmptyRooms();
  next();
});

// Join a room
router.post('/join', (req, res) => {
  try {
    const { name, room } = req.body;
    
    if (!name || !room) {
      return res.status(400).json({ success: false, message: 'Name and room are required' });
    }
    
    const roomData = getRoom(room);
    roomData.users.add(name);
    roomData.messages.push({
      type: 'update',
      text: `${name} joined the chat`,
      timestamp: Date.now()
    });
    cleanupRoomMessages(roomData);
    
    console.log(`User ${name} joined room ${room}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Join error:', error);
    res.status(400).json({ success: false, message: 'Invalid request' });
  }
});

// Leave a room
router.post('/leave', (req, res) => {
  try {
    const { name, room } = req.body;
    
    if (!name || !room) {
      return res.status(400).json({ success: false, message: 'Name and room are required' });
    }
    
    const roomData = getRoom(room);
    roomData.users.delete(name);
    roomData.messages.push({
      type: 'update',
      text: `${name} left the chat`,
      timestamp: Date.now()
    });
    cleanupRoomMessages(roomData);
    
    console.log(`User ${name} left room ${room}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Leave error:', error);
    res.status(400).json({ success: false, message: 'Invalid request' });
  }
});

// Send a message
router.post('/message', (req, res) => {
  try {
    const { name, message, room } = req.body;
    
    if (!name || !message || !room) {
      return res.status(400).json({ success: false, message: 'Name, message, and room are required' });
    }
    
    const roomData = getRoom(room);
    roomData.messages.push({
      type: 'chat',
      name,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    });
    cleanupRoomMessages(roomData);
    
    console.log(`Message from ${name} in room ${room}: ${message}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Message error:', error);
    res.status(400).json({ success: false, message: 'Invalid request' });
  }
});

// Get messages
router.get('/messages', (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const room = req.query.room;
    
    if (!room) {
      return res.status(400).json({ success: false, message: 'Room parameter is required' });
    }
    
    const roomData = getRoom(room);
    const newMessages = roomData.messages.filter(msg => msg.timestamp > since);
    
    res.status(200).json({ 
      success: true,
      messages: newMessages,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(400).json({ success: false, message: 'Invalid request' });
  }
});

// Get room statistics
router.get('/rooms', (req, res) => {
  try {
    const roomStats = Array.from(rooms.entries()).map(([roomId, room]) => ({
      roomId,
      userCount: room.users.size,
      messageCount: room.messages.length,
      created: room.created
    }));
    
    res.status(200).json({ 
      success: true,
      rooms: roomStats,
      totalRooms: rooms.size
    });
  } catch (error) {
    console.error('Rooms error:', error);
    res.status(400).json({ success: false, message: 'Invalid request' });
  }
});

// Health check
router.get('/health', (req, res) => {
  try {
    const totalUsers = Array.from(rooms.values()).reduce((sum, room) => sum + room.users.size, 0);
    const totalMessages = Array.from(rooms.values()).reduce((sum, room) => sum + room.messages.length, 0);
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      app: 'A2Z Chat',
      totalRooms: rooms.size,
      totalUsers,
      totalMessages
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
