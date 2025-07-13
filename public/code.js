// A2Z Chat - Production Ready Chat Application
(function() {
  'use strict';
  
  // Global state
  let state = {
    username: null,
    roomId: null,
    isConnected: false,
    lastMessageTimestamp: 0,
    pollInterval: null,
    currentScreen: 'landing',
    isPolling: false
  };

  // Configuration
  const config = {
    pollInterval: 1000,
    maxRetries: 3,
    retryDelay: 2000,
    apiBaseUrl: window.location.origin
  };

  // Utility functions
  const utils = {
    generateRoomId() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },

    showNotification(message, type = 'info') {
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Remove existing notifications
      const existing = document.querySelector('.notification');
      if (existing) existing.remove();
      
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00a884' : type === 'error' ? '#ea4335' : '#111b21'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-weight: 500;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 4000);
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    },

    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  };

  // API functions
  const api = {
    async request(endpoint, options = {}) {
      const url = `${config.apiBaseUrl}/api/${endpoint}`;
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      try {
        console.log(`API Request: ${finalOptions.method || 'GET'} ${url}`, finalOptions.body ? JSON.parse(finalOptions.body) : '');
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        console.log(`API Response:`, data);
        
        if (!response.ok) {
          throw new Error(data.message || `HTTP ${response.status}`);
        }
        
        return data;
      } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
      }
    },

    async join(name, room) {
      return this.request('join', {
        method: 'POST',
        body: JSON.stringify({ name, room })
      });
    },

    async leave(name, room) {
      return this.request('leave', {
        method: 'POST',
        body: JSON.stringify({ name, room })
      });
    },

    async sendMessage(name, message, room) {
      return this.request('message', {
        method: 'POST',
        body: JSON.stringify({ name, message, room })
      });
    },

    async getMessages(room, since = 0) {
      return this.request(`messages?room=${encodeURIComponent(room)}&since=${since}`);
    }
  };

  // Screen management
  const screens = {
    show(screenName) {
      console.log(`Switching to screen: ${screenName}`);
      
      // Hide all screens
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
      });
      
      // Show target screen
      const targetScreen = document.querySelector(`.${screenName}-screen`);
      if (targetScreen) {
        targetScreen.classList.add('active');
        state.currentScreen = screenName;
        
        // Update URL for certain screens
        if (screenName === 'chat' && state.roomId) {
          const newUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomId}`;
          window.history.pushState({}, '', newUrl);
        } else if (screenName === 'landing' || screenName === 'welcome') {
          window.history.pushState({}, '', window.location.pathname);
        }
      } else {
        console.error(`Screen not found: ${screenName}`);
      }
    }
  };

  // Room management
  const room = {
    create() {
      const roomId = utils.generateRoomId();
      state.roomId = roomId;
      this.updateDisplay();
      utils.showNotification(`Room ${roomId} created!`, 'success');
      return roomId;
    },

    updateDisplay() {
      const roomIdText = document.getElementById('room-id-text');
      const roomInfo = document.getElementById('room-info');
      
      if (roomIdText && state.roomId) {
        roomIdText.textContent = state.roomId;
      }
      
      if (roomInfo && state.roomId) {
        roomInfo.style.display = 'block';
      }
    },

    hideDisplay() {
      const roomInfo = document.getElementById('room-info');
      if (roomInfo) {
        roomInfo.style.display = 'none';
      }
    },

    async join(username, roomId) {
      try {
        console.log(`Attempting to join room ${roomId} as ${username}`);
        
        const result = await api.join(username, roomId);
        
        if (result.success) {
          state.username = username;
          state.roomId = roomId.toUpperCase();
          state.isConnected = true;
          
          screens.show('chat');
          chat.updateHeader();
          chat.showWelcomeMessage();
          chat.startPolling();
          
          utils.showNotification(`Welcome to room ${state.roomId}!`, 'success');
          return true;
        } else {
          throw new Error(result.message || 'Failed to join room');
        }
      } catch (error) {
        console.error('Join error:', error);
        utils.showNotification(`Failed to join room: ${error.message}`, 'error');
        return false;
      }
    },

    async leave() {
      if (!state.username || !state.roomId) return;
      
      try {
        await api.leave(state.username, state.roomId);
      } catch (error) {
        console.error('Leave error:', error);
      }
      
      chat.stopPolling();
      state.username = null;
      state.roomId = null;
      state.isConnected = false;
      state.lastMessageTimestamp = 0;
      
      chat.clearMessages();
      this.hideDisplay();
      screens.show('welcome');
    },

    getShareLink() {
      if (!state.roomId) return '';
      return `${window.location.origin}${window.location.pathname}?room=${state.roomId}`;
    }
  };

  // Chat functionality
  const chat = {
    updateHeader() {
      const chatTitle = document.querySelector('.chat-title span');
      const statusText = document.getElementById('status-text');
      
      if (chatTitle && state.roomId) {
        chatTitle.textContent = `A2Z Chat - ${state.roomId}`;
      }
      
      if (statusText) {
        statusText.textContent = state.isConnected ? 'Connected' : 'Connecting...';
      }
    },

    showWelcomeMessage() {
      const messagesContainer = document.getElementById('messages-area');
      if (!messagesContainer || !state.roomId) return;
      
      // Clear existing messages
      messagesContainer.innerHTML = '';
      
      const welcomeMessage = document.createElement('div');
      welcomeMessage.className = 'welcome-message';
      welcomeMessage.innerHTML = `
        <div class="welcome-icon">
          <i class="fas fa-comments"></i>
        </div>
        <h3>Welcome to A2Z Chat!</h3>
        <p>You've joined room <strong>${state.roomId}</strong>. Share this room with others to start chatting!</p>
        <div class="share-invite">
          <p><strong>Invite others:</strong></p>
          <div class="invite-link">
            <input type="text" value="${room.getShareLink()}" readonly>
            <button class="btn-copy-link" onclick="window.chatApp.copyInviteLink(this)">
              <i class="fas fa-copy"></i> Copy
            </button>
          </div>
        </div>
      `;
      
      messagesContainer.appendChild(welcomeMessage);
      this.scrollToBottom();
    },

    async sendMessage(messageText) {
      if (!messageText.trim() || !state.username || !state.roomId) {
        return false;
      }

      try {
        console.log(`Sending message: "${messageText}" to room ${state.roomId}`);
        
        const result = await api.sendMessage(state.username, messageText, state.roomId);
        
        if (result.success) {
          // Add message to UI immediately
          this.renderMessage('my', {
            name: state.username,
            message: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          
          this.scrollToBottom();
          return true;
        } else {
          throw new Error(result.message || 'Failed to send message');
        }
      } catch (error) {
        console.error('Send message error:', error);
        utils.showNotification(`Failed to send message: ${error.message}`, 'error');
        return false;
      }
    },

    startPolling() {
      if (state.pollInterval || !state.roomId || state.isPolling) {
        console.log('Polling already active or no room');
        return;
      }
      
      console.log('Starting message polling...');
      state.isPolling = true;
      
      state.pollInterval = setInterval(async () => {
        try {
          const result = await api.getMessages(state.roomId, state.lastMessageTimestamp);
          
          if (result.success && result.messages && result.messages.length > 0) {
            console.log(`Received ${result.messages.length} new messages`);
            
            result.messages.forEach(message => {
              if (message.type === 'chat' && message.name !== state.username) {
                this.renderMessage('other', message);
              } else if (message.type === 'update') {
                this.renderMessage('update', { message: message.text });
              }
            });
            
            state.lastMessageTimestamp = result.timestamp;
            this.scrollToBottom();
          }
          
          if (!state.isConnected) {
            state.isConnected = true;
            this.updateConnectionStatus('Connected', 'success');
          }
        } catch (error) {
          console.error('Polling error:', error);
          if (state.isConnected) {
            state.isConnected = false;
            this.updateConnectionStatus('Connection Error', 'error');
          }
        }
      }, config.pollInterval);
    },

    stopPolling() {
      if (state.pollInterval) {
        console.log('Stopping message polling...');
        clearInterval(state.pollInterval);
        state.pollInterval = null;
        state.isPolling = false;
      }
    },

    updateConnectionStatus(message, type) {
      const statusText = document.getElementById('status-text');
      if (statusText) {
        statusText.textContent = message;
        const statusIcon = statusText.parentElement.querySelector('.status-dot');
        if (statusIcon) {
          statusIcon.style.color = type === 'success' ? '#06d755' : '#ea4335';
        }
      }
    },

    renderMessage(type, data) {
      const messagesContainer = document.getElementById('messages-area');
      if (!messagesContainer) {
        console.error('Messages container not found');
        return;
      }
      
      const messageDiv = document.createElement('div');
      
      if (type === 'update') {
        messageDiv.className = 'update';
        messageDiv.textContent = data.message || data;
      } else {
        messageDiv.className = `message ${type}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (type === 'other') {
          const nameDiv = document.createElement('div');
          nameDiv.className = 'name';
          nameDiv.textContent = data.name;
          messageContent.appendChild(nameDiv);
        }
        
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = data.message;
        messageContent.appendChild(textDiv);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time';
        timeDiv.innerHTML = `${data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <i class="fas fa-check"></i>`;
        messageContent.appendChild(timeDiv);
        
        messageDiv.appendChild(messageContent);
      }
      
      messagesContainer.appendChild(messageDiv);
    },

    clearMessages() {
      const messagesContainer = document.getElementById('messages-area');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }
    },

    scrollToBottom() {
      const messagesContainer = document.getElementById('messages-area');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  // Event handlers
  const handlers = {
    init() {
      console.log('Initializing A2Z Chat...');
      
      // Check URL for room parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoomId = urlParams.get('room');
      
      if (urlRoomId) {
        state.roomId = urlRoomId.toUpperCase();
        room.updateDisplay();
        screens.show('join');
      } else {
        screens.show('landing');
      }
      
      this.attachEventListeners();
    },

    attachEventListeners() {
      console.log('Attaching event listeners...');
      
      // Landing screen
      const startChattingBtn = document.getElementById('start-chatting');
      if (startChattingBtn) {
        startChattingBtn.addEventListener('click', () => {
          screens.show('welcome');
        });
      }

      // Welcome screen
      const createRoomBtn = document.getElementById('create-room');
      const joinExistingBtn = document.getElementById('join-existing');
      
      if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
          room.create();
          screens.show('join');
        });
      }
      
      if (joinExistingBtn) {
        joinExistingBtn.addEventListener('click', () => {
          room.hideDisplay();
          state.roomId = null;
          screens.show('join');
        });
      }

      // Join screen
      const backToWelcome = document.getElementById('back-to-welcome');
      const joinChatBtn = document.getElementById('join-chat');
      const copyRoomIdBtn = document.getElementById('copy-room-id');
      
      if (backToWelcome) {
        backToWelcome.addEventListener('click', () => {
          room.hideDisplay();
          state.roomId = null;
          screens.show('welcome');
        });
      }
      
      if (joinChatBtn) {
        joinChatBtn.addEventListener('click', this.handleJoinRoom.bind(this));
      }
      
      if (copyRoomIdBtn) {
        copyRoomIdBtn.addEventListener('click', async () => {
          const roomIdText = document.getElementById('room-id-text');
          if (roomIdText && roomIdText.textContent) {
            const success = await utils.copyToClipboard(roomIdText.textContent);
            if (success) {
              utils.showNotification('Room ID copied to clipboard!', 'success');
            }
          }
        });
      }

      // Chat screen
      const exitChatBtn = document.getElementById('exit-chat');
      const shareRoomBtn = document.getElementById('share-room');
      const sendMessageBtn = document.getElementById('send-message');
      const messageInput = document.getElementById('message-input');
      
      if (exitChatBtn) {
        exitChatBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to leave the chat?')) {
            await room.leave();
          }
        });
      }
      
      if (shareRoomBtn) {
        shareRoomBtn.addEventListener('click', this.openShareModal.bind(this));
      }
      
      if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', this.handleSendMessage.bind(this));
      }
      
      if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendMessage();
          }
        });
      }

      // Share modal
      const closeShareModal = document.getElementById('close-share-modal');
      const modalCopyLink = document.getElementById('modal-copy-link');
      const modal = document.getElementById('share-modal');
      
      if (closeShareModal) {
        closeShareModal.addEventListener('click', this.closeShareModal.bind(this));
      }
      
      if (modalCopyLink) {
        modalCopyLink.addEventListener('click', this.copyShareLink.bind(this));
      }
      
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeShareModal();
          }
        });
      }
    },

    async handleJoinRoom() {
      const usernameInput = document.getElementById('username');
      const roomIdText = document.getElementById('room-id-text');
      
      if (!usernameInput) {
        utils.showNotification('Username input not found', 'error');
        return;
      }
      
      const username = usernameInput.value.trim();
      
      if (!username) {
        utils.showNotification('Please enter your name', 'error');
        usernameInput.focus();
        return;
      }

      if (username.length > 20) {
        utils.showNotification('Name must be 20 characters or less', 'error');
        usernameInput.focus();
        return;
      }
      
      // Get room ID
      let roomId = state.roomId;
      if (!roomId && roomIdText && roomIdText.textContent) {
        roomId = roomIdText.textContent;
      }
      
      if (!roomId) {
        roomId = prompt('Enter Room ID:');
        if (!roomId) {
          utils.showNotification('Room ID is required', 'error');
          return;
        }
      }
      
      await room.join(username, roomId);
    },

    handleSendMessage() {
      const messageInput = document.getElementById('message-input');
      if (!messageInput) return;
      
      const message = messageInput.value.trim();
      if (!message) return;
      
      chat.sendMessage(message).then(success => {
        if (success) {
          messageInput.value = '';
        }
      });
    },

    openShareModal() {
      const modal = document.getElementById('share-modal');
      const shareLink = document.getElementById('modal-share-link');
      
      if (modal && shareLink && state.roomId) {
        shareLink.value = room.getShareLink();
        modal.classList.add('active');
      }
    },

    closeShareModal() {
      const modal = document.getElementById('share-modal');
      if (modal) {
        modal.classList.remove('active');
      }
    },

    async copyShareLink() {
      const shareLink = document.getElementById('modal-share-link');
      if (shareLink) {
        const success = await utils.copyToClipboard(shareLink.value);
        if (success) {
          utils.showNotification('Link copied to clipboard!', 'success');
        }
      }
    }
  };

  // Global functions for inline event handlers
  window.chatApp = {
    async copyInviteLink(button) {
      const input = button.previousElementSibling;
      const success = await utils.copyToClipboard(input.value);
      
      if (success) {
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          button.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
      }
    }
  };

  // Add notification animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlers.init.bind(handlers));
  } else {
    handlers.init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    chat.stopPolling();
  });

  console.log('A2Z Chat initialized successfully');
})();
