const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Store connected users
const connectedUsers = new Map();
let userCount = 0;

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Handle new user joining
    socket.on("newuser", (username) => {
        try {
            // Store user information
            connectedUsers.set(socket.id, {
                username: username,
                joinTime: new Date()
            });
            
            userCount++;
            
            // Broadcast to all other users
            socket.broadcast.emit("update", `${username} joined the conversation`);
            
            // Send user count to all users
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
                
                // Broadcast to all other users
                socket.broadcast.emit("update", `${username} left the conversation`);
                
                // Send updated user count
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
            // Validate message
            if (!message || !message.text || !message.username) {
                socket.emit("error", { message: "Invalid message format" });
                return;
            }
            
            // Sanitize message text (basic sanitization)
            const sanitizedMessage = {
                ...message,
                text: message.text.substring(0, 500), // Limit message length
                username: message.username.substring(0, 20), // Limit username length
                timestamp: new Date().toISOString()
            };
            
            // Broadcast to all other users
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
                
                // Broadcast to all other users
                socket.broadcast.emit("update", `${user.username} left the conversation`);
                
                // Send updated user count
                io.emit("user-count", userCount);
                
                console.log(`${user.username} disconnected. Total users: ${userCount}`);
            }
        } catch (error) {
            console.error("Error handling disconnect:", error);
        }
    });

    // Handle connection errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Express error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        users: userCount,
        timestamp: new Date().toISOString()
    });
});

// Get current user count endpoint
app.get("/api/users", (req, res) => {
    res.json({ 
        count: userCount,
        users: Array.from(connectedUsers.values()).map(user => ({
            username: user.username,
            joinTime: user.joinTime
        }))
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 A2Z Chat server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
