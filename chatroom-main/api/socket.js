const { Server } = require('socket.io');

let io;

const SocketHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...');
    
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    res.socket.server.io = io;
    
    // Store connected users
    const connectedUsers = new Map();
    let userCount = 0;
    
    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
      
      // Handle new user joining
      socket.on("newuser", (username) => {
        try {
          connectedUsers.set(socket.id, {
            username: username,
            joinTime: new Date()
          });
          
          userCount++;
          socket.broadcast.emit("update", `${username} joined the conversation`);
          io.emit("user-count", userCount);
          
          console.log(`${username} joined the chat. Total users: ${userCount}`);
        } catch (error) {
          console.error("Error handling new user:", error);
          socket.emit("error", { message: "Failed to join chat" });
        }
      });

      // Handle user leaving
      socket.on("exituser", (username) => {
        try {
          if (connectedUsers.has(socket.id)) {
            connectedUsers.delete(socket.id);
            userCount--;
            
            socket.broadcast.emit("update", `${username} left the conversation`);
            io.emit("user-count", userCount);
            
            console.log(`${username} left the chat. Total users: ${userCount}`);
          }
        } catch (error) {
          console.error("Error handling user exit:", error);
        }
      });

      // Handle chat messages
      socket.on("chat", (message) => {
        try {
          if (!message || !message.text || !message.username) {
            socket.emit("error", { message: "Invalid message format" });
            return;
          }
          
          const sanitizedMessage = {
            ...message,
            text: message.text.substring(0, 500),
            username: message.username.substring(0, 20),
            timestamp: new Date().toISOString()
          };
          
          socket.broadcast.emit("chat", sanitizedMessage);
          console.log(`Message from ${sanitizedMessage.username}: ${sanitizedMessage.text}`);
        } catch (error) {
          console.error("Error handling chat message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // Handle typing indicator
      socket.on("typing", (data) => {
        try {
          if (data && data.username) {
            socket.broadcast.emit("typing", {
              username: data.username,
              socketId: socket.id
            });
          }
        } catch (error) {
          console.error("Error handling typing indicator:", error);
        }
      });

      // Handle stop typing
      socket.on("stop-typing", () => {
        try {
          socket.broadcast.emit("stop-typing", {
            socketId: socket.id
          });
        } catch (error) {
          console.error("Error handling stop typing:", error);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        try {
          if (connectedUsers.has(socket.id)) {
            const user = connectedUsers.get(socket.id);
            connectedUsers.delete(socket.id);
            userCount--;
            
            socket.broadcast.emit("update", `${user.username} left the conversation`);
            io.emit("user-count", userCount);
            
            console.log(`${user.username} disconnected. Total users: ${userCount}`);
          }
        } catch (error) {
          console.error("Error handling disconnect:", error);
        }
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    });
  }
  
  res.end();
};

module.exports = SocketHandler;
