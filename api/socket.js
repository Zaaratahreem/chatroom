// Simple polling-based chat server for Vercel
let messages = [];
let users = new Set();

// Clean up old messages (keep last 50)
function cleanupMessages() {
  if (messages.length > 50) {
    messages = messages.slice(-50);
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
  
  // Handle different endpoints
  if (pathname === '/api/join') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { username } = JSON.parse(body);
          users.add(username);
          messages.push({
            type: 'update',
            text: `${username} joined the conversation`,
            timestamp: Date.now()
          });
          cleanupMessages();
          res.status(200).json({ success: true });
        } catch (error) {
          res.status(400).json({ error: 'Invalid request' });
        }
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
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
          const { username } = JSON.parse(body);
          users.delete(username);
          messages.push({
            type: 'update',
            text: `${username} left the conversation`,
            timestamp: Date.now()
          });
          cleanupMessages();
          res.status(200).json({ success: true });
        } catch (error) {
          res.status(400).json({ error: 'Invalid request' });
        }
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
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
          const { username, text, time } = JSON.parse(body);
          messages.push({
            type: 'chat',
            username,
            text,
            time,
            timestamp: Date.now()
          });
          cleanupMessages();
          res.status(200).json({ success: true });
        } catch (error) {
          res.status(400).json({ error: 'Invalid request' });
        }
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/messages') {
    if (req.method === 'GET') {
      const since = parseInt(url.searchParams.get('since')) || 0;
      const newMessages = messages.filter(msg => msg.timestamp > since);
      res.status(200).json({ 
        messages: newMessages,
        timestamp: Date.now()
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  }
  
  else if (pathname === '/api/health') {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      activeUsers: users.size,
      messageCount: messages.length
    });
  }
  
  else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
};
