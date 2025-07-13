// A2Z Chat - Room-based polling chat server for Vercel
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
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size === 0 && room.created < oneHourAgo) {
      rooms.delete(roomId);
    }
  }
}

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Clean up empty rooms periodically
  cleanupEmptyRooms();
  
  // Handle different endpoints
  if (pathname === '/api/join') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { name, room } = JSON.parse(body);
          if (!name || !room) {
            res.status(400).json({ success: false, message: 'Name and room are required' });
            return;
          }
          
          const roomData = getRoom(room);
          roomData.users.add(name);
          roomData.messages.push({
            type: 'update',
            text: `${name} joined the chat`,
            timestamp: Date.now()
          });
          cleanupRoomMessages(roomData);
          
          res.status(200).json({ success: true });
        } catch (error) {
          res.status(400).json({ success: false, message: 'Invalid request' });
        }
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/leave') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { name, room } = JSON.parse(body);
          if (!name || !room) {
            res.status(400).json({ success: false, message: 'Name and room are required' });
            return;
          }
          
          const roomData = getRoom(room);
          roomData.users.delete(name);
          roomData.messages.push({
            type: 'update',
            text: `${name} left the chat`,
            timestamp: Date.now()
          });
          cleanupRoomMessages(roomData);
          
          res.status(200).json({ success: true });
        } catch (error) {
          res.status(400).json({ success: false, message: 'Invalid request' });
        }
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/message') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { name, message, room } = JSON.parse(body);
          if (!name || !message || !room) {
            res.status(400).json({ success: false, message: 'Name, message, and room are required' });
            return;
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
          
          res.status(200).json({ success: true });
        } catch (error) {
          res.status(400).json({ success: false, message: 'Invalid request' });
        }
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/messages') {
    if (req.method === 'GET') {
      const since = parseInt(url.searchParams.get('since')) || 0;
      const room = url.searchParams.get('room');
      
      if (!room) {
        res.status(400).json({ success: false, message: 'Room parameter is required' });
        return;
      }
      
      const roomData = getRoom(room);
      const newMessages = roomData.messages.filter(msg => msg.timestamp > since);
      
      res.status(200).json({ 
        success: true,
        messages: newMessages,
        timestamp: Date.now()
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/rooms') {
    if (req.method === 'GET') {
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
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/health') {
    const totalUsers = Array.from(rooms.values()).reduce((sum, room) => sum + room.users.size, 0);
    const totalMessages = Array.from(rooms.values()).reduce((sum, room) => sum + room.messages.length, 0);
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      totalRooms: rooms.size,
      totalUsers,
      totalMessages
    });
  }
  
  else {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
};
