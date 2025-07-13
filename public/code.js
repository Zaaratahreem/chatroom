(function() {
  const app = document.querySelector(".app");
  
  // Initialize Socket.IO with Vercel-compatible configuration
  const socket = io({
    transports: ['polling'], // Use polling only for Vercel compatibility
    upgrade: false,
    rememberUpgrade: false,
    timeout: 20000,
    forceNew: true,
    autoConnect: true
  });
  
  let uname;
  let isConnected = false;

  // Connection status handling
  socket.on('connect', function() {
    isConnected = true;
    console.log('Connected to server via polling');
    // Remove any connection error messages
    const errorMessages = app.querySelectorAll('.connection-error');
    errorMessages.forEach(msg => msg.remove());
    
    // Show connection status
    showConnectionStatus('Connected', 'success');
  });

  socket.on('disconnect', function() {
    isConnected = false;
    console.log('Disconnected from server');
    renderMessage("update", "Connection lost. Trying to reconnect...");
    showConnectionStatus('Disconnected', 'error');
  });

  socket.on('connect_error', function(error) {
    console.error('Connection error:', error);
    renderMessage("update", "Connection error. Please check your internet connection.");
    showConnectionStatus('Connection Error', 'error');
  });

  socket.on('reconnect', function() {
    console.log('Reconnected to server');
    renderMessage("update", "Reconnected to chat");
    showConnectionStatus('Reconnected', 'success');
  });

  // Show connection status
  function showConnectionStatus(status, type) {
    let statusEl = document.querySelector('.connection-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'connection-status';
      statusEl.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = status;
    statusEl.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
    statusEl.style.color = 'white';
    
    if (type === 'success') {
      setTimeout(() => {
        if (statusEl) {
          statusEl.style.opacity = '0';
          setTimeout(() => statusEl.remove(), 300);
        }
      }, 2000);
    }
  }

  // Event listener for joining the chat
  app.querySelector(".join-screen #join-user").addEventListener("click", function () {
      let username = app.querySelector(".join-screen #username").value.trim();
      if (username.length == 0) {
          alert("Please enter a username");
          return;
      }
      if (username.length > 20) {
          alert("Username must be 20 characters or less");
          return;
      }
      
      if (!isConnected) {
          alert("Not connected to server. Please wait and try again.");
          return;
      }
      
      socket.emit("newuser", username);
      uname = username;

      app.querySelector(".join-screen").classList.remove("active");
      app.querySelector(".chat-screen").classList.add("active");
      
      // Focus on message input
      app.querySelector(".chat-screen #message-input").focus();
  });

  // Event listener for Enter key in username input
  app.querySelector(".join-screen #username").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
          app.querySelector(".join-screen #join-user").click();
      }
  });

  // Event listener for sending messages
  app.querySelector(".chat-screen #send-message").addEventListener("click", function () {
      sendMessage();
  });

  // Event listener for Enter key in message input
  app.querySelector(".chat-screen #message-input").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
          sendMessage();
      }
  });

  function sendMessage() {
      let messageInput = app.querySelector(".chat-screen #message-input");
      let message = messageInput.value.trim();
      
      if (message.length == 0) {
          return;
      }
      
      if (!isConnected) {
          alert("Not connected to server. Message not sent.");
          return;
      }
      
      let timestamp = new Date().toLocaleTimeString();

      renderMessage("my", { username: uname, text: message, time: timestamp });

      socket.emit("chat", { username: uname, text: message, time: timestamp });

      messageInput.value = "";
      messageInput.focus();
  }

  // Event listener for exiting the chat
  app.querySelector(".chat-screen #exit-chat").addEventListener("click", function () {
      if (confirm("Are you sure you want to leave the chat?")) {
          socket.emit("exituser", uname);
          window.location.reload();
      }
  });

  // Listen for incoming messages from other users
  socket.on("update", function(update) { 
      renderMessage("update", update);
  });
  
  socket.on("chat", function(message) { 
      renderMessage("other", message);
  });

  // Render a message to the chat screen
  function renderMessage(type, message) {
      let messageContainer = app.querySelector(".chat-screen .messages");

      if (type === "my") {
          let el = document.createElement("div");
          el.setAttribute("class", "message my-message");
          el.innerHTML = `
              <div>
                  <div class="name">YOU</div>
                  <div class="text">${escapeHtml(message.text)}</div>
                  <div class="time" style="text-align: right; font-size: 0.8em; color: gray; margin-top: 4px;">
                      ${message.time}
                  </div>
              </div>
          `;
          messageContainer.appendChild(el);
      } else if (type === "other") {
          let el = document.createElement("div");
          el.setAttribute("class","message other-message");
          el.innerHTML = `
              <div>
                  <div class="name">${escapeHtml(message.username)}</div>
                  <div class="text">${escapeHtml(message.text)}</div>
                  <div class="time" style="text-align: left; font-size: 0.8em; color: gray; margin-top: 4px;">
                      ${message.time}
                  </div>
              </div>
          `;
          messageContainer.appendChild(el);
      } else if (type === "update") {
          let el = document.createElement("div");
          el.setAttribute("class", "update");
          el.innerText = message;
          messageContainer.appendChild(el);
      }

      // Scroll chat to end
      messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
  }

  // Utility function to escape HTML to prevent XSS
  function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }
})();

