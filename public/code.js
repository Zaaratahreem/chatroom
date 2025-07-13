(function() {
  const app = document.querySelector(".app");
  
  let uname;
  let isConnected = false;
  let lastMessageTimestamp = 0;
  let pollInterval;

  // Polling-based chat client for Vercel compatibility
  function startPolling() {
    if (pollInterval) return;
    
    pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/messages?since=${lastMessageTimestamp}`);
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(message => {
            if (message.type === 'chat') {
              renderMessage("other", message);
            } else if (message.type === 'update') {
              renderMessage("update", message.text);
            }
          });
          lastMessageTimestamp = data.timestamp;
        }
        
        if (!isConnected) {
          isConnected = true;
          showConnectionStatus('Connected', 'success');
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (isConnected) {
          isConnected = false;
          showConnectionStatus('Connection Error', 'error');
        }
      }
    }, 1000); // Poll every second
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

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

  // API helper functions
  async function apiCall(endpoint, data = null) {
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(endpoint, options);
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // Event listener for joining the chat
  app.querySelector(".join-screen #join-user").addEventListener("click", async function () {
      let username = app.querySelector(".join-screen #username").value.trim();
      if (username.length == 0) {
          alert("Please enter a username");
          return;
      }
      if (username.length > 20) {
          alert("Username must be 20 characters or less");
          return;
      }
      
      try {
        await apiCall('/api/join', { username });
        uname = username;

        app.querySelector(".join-screen").classList.remove("active");
        app.querySelector(".chat-screen").classList.add("active");
        
        // Start polling for messages
        startPolling();
        
        // Focus on message input
        app.querySelector(".chat-screen #message-input").focus();
      } catch (error) {
        alert("Failed to join chat. Please try again.");
      }
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

  async function sendMessage() {
      let messageInput = app.querySelector(".chat-screen #message-input");
      let message = messageInput.value.trim();
      
      if (message.length == 0) {
          return;
      }
      
      let timestamp = new Date().toLocaleTimeString();
      let messageData = { username: uname, text: message, time: timestamp };

      // Show message immediately
      renderMessage("my", messageData);

      try {
        await apiCall('/api/message', messageData);
        messageInput.value = "";
        messageInput.focus();
      } catch (error) {
        alert("Failed to send message. Please try again.");
      }
  }

  // Event listener for exiting the chat
  app.querySelector(".chat-screen #exit-chat").addEventListener("click", async function () {
      if (confirm("Are you sure you want to leave the chat?")) {
          try {
            await apiCall('/api/leave', { username: uname });
          } catch (error) {
            console.error('Failed to notify server of exit:', error);
          }
          
          stopPolling();
          window.location.reload();
      }
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

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
      stopPolling();
  });
})();

