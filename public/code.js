// A2Z Chat - Modern WhatsApp-inspired Chat Application
(function() {
  let uname;
  let roomId;
  let isConnected = false;
  let lastMessageTimestamp = 0;
  let pollInterval;
  let currentScreen = 'welcome';

  // Initialize app
  function init() {
    console.log('Initializing A2Z Chat...');
    
    // Check if there's a room ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    
    if (urlRoomId) {
      roomId = urlRoomId;
      showScreen('join');
      const roomIdText = document.getElementById('room-id-text');
      if (roomIdText) {
        roomIdText.textContent = roomId;
        const roomInfo = document.getElementById('room-info');
        if (roomInfo) roomInfo.style.display = 'block';
      }
    } else {
      showScreen('landing');
    }
    
    attachEventListeners();
  }

  // Screen management
  function showScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.querySelector(`.${screenName}-screen`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      currentScreen = screenName;
    }
  }

  // Generate random room ID
  function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Attach event listeners
  function attachEventListeners() {
    // Landing screen button
    const startChattingBtn = document.getElementById('start-chatting');
    
    if (startChattingBtn) {
      startChattingBtn.addEventListener('click', () => {
        console.log('Start chatting clicked');
        showScreen('welcome');
      });
    }

    // Welcome screen buttons
    const createRoomBtn = document.getElementById('create-room');
    const joinRoomBtn = document.getElementById('join-existing');
    
    if (createRoomBtn) {
      createRoomBtn.addEventListener('click', () => {
        console.log('Create room clicked');
        roomId = generateRoomId();
        const roomIdText = document.getElementById('room-id-text');
        if (roomIdText) {
          roomIdText.textContent = roomId;
          const roomInfo = document.getElementById('room-info');
          if (roomInfo) roomInfo.style.display = 'block';
        }
        showScreen('join');
      });
    }
    
    if (joinRoomBtn) {
      joinRoomBtn.addEventListener('click', () => {
        console.log('Join existing clicked');
        const roomInfo = document.getElementById('room-info');
        if (roomInfo) roomInfo.style.display = 'none';
        showScreen('join');
      });
    }

    // Join screen
    const backToWelcome = document.getElementById('back-to-welcome');
    const joinButton = document.getElementById('join-chat');
    const copyRoomIdBtn = document.getElementById('copy-room-id');
    
    if (backToWelcome) {
      backToWelcome.addEventListener('click', () => {
        console.log('Back to welcome clicked');
        showScreen('welcome');
        const roomInfo = document.getElementById('room-info');
        if (roomInfo) roomInfo.style.display = 'none';
        roomId = null;
      });
    }
    
    if (joinButton) {
      joinButton.addEventListener('click', handleJoinRoom);
    }
    
    if (copyRoomIdBtn) {
      copyRoomIdBtn.addEventListener('click', async () => {
        const roomIdText = document.getElementById('room-id-text');
        if (roomIdText && roomIdText.textContent) {
          try {
            await navigator.clipboard.writeText(roomIdText.textContent);
            showNotification('Room ID copied to clipboard!', 'success');
          } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = roomIdText.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Room ID copied to clipboard!', 'success');
          }
        }
      });
    }

    // Chat screen
    const backToJoin = document.getElementById('back-to-join');
    const exitChatBtn = document.getElementById('exit-chat');
    const shareRoomBtn = document.getElementById('share-room');
    const sendMessageBtn = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');
    
    if (backToJoin) {
      backToJoin.addEventListener('click', handleExitChat);
    }
    
    if (exitChatBtn) {
      exitChatBtn.addEventListener('click', handleExitChat);
    }
    
    if (shareRoomBtn) {
      shareRoomBtn.addEventListener('click', openShareModal);
    }
    
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', handleSendMessage);
    }
    
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleSendMessage();
        }
      });
    }

    // Modal controls
    const closeModal = document.getElementById('close-share-modal');
    const copyShareLink = document.getElementById('modal-copy-link');
    
    if (closeModal) {
      closeModal.addEventListener('click', closeShareModal);
    }
    
    if (copyShareLink) {
      copyShareLink.addEventListener('click', copyShareLinkToClipboard);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('share-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeShareModal();
        }
      });
    }
  }

  // Handle joining room
  async function handleJoinRoom() {
    console.log('Attempting to join room...');
    
    const nameInput = document.getElementById('username');
    const roomIdText = document.getElementById('room-id-text');
    
    if (!nameInput) {
      showNotification('Username input not found', 'error');
      return;
    }
    
    const name = nameInput.value.trim();
    
    if (!name) {
      showNotification('Please enter your name', 'error');
      nameInput.focus();
      return;
    }
    
    // Get room ID from display or prompt user
    let currentRoomId = roomId;
    if (!currentRoomId && roomIdText && roomIdText.textContent) {
      currentRoomId = roomIdText.textContent;
    }
    
    if (!currentRoomId) {
      currentRoomId = prompt('Enter Room ID:');
      if (!currentRoomId) {
        showNotification('Room ID is required', 'error');
        return;
      }
    }
    
    uname = name;
    roomId = currentRoomId.toUpperCase();
    
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: uname, room: roomId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showScreen('chat');
        updateChatHeader();
        showWelcomeMessage();
        startPolling();
        // Update URL without refreshing
        const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        window.history.pushState({}, '', newUrl);
      } else {
        showNotification(data.message || 'Failed to join room', 'error');
      }
    } catch (error) {
      console.error('Join error:', error);
      showNotification('Connection error. Please try again.', 'error');
    }
  }

  // Update chat header
  function updateChatHeader() {
    const chatTitle = document.querySelector('.chat-title span');
    const statusText = document.getElementById('status-text');
    
    if (chatTitle) {
      chatTitle.textContent = `A2Z Chat - ${roomId}`;
    }
    
    if (statusText) {
      statusText.textContent = 'Connected';
    }
  }

  // Show welcome message in chat
  function showWelcomeMessage() {
    const messagesContainer = document.getElementById('messages-area');
    if (!messagesContainer) return;
    
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcome-message';
    welcomeMessage.innerHTML = `
      <div class="welcome-icon">
        <i class="fas fa-comments"></i>
      </div>
      <h3>Welcome to A2Z Chat!</h3>
      <p>You've joined room <strong>${roomId}</strong>. Share this room with others to start chatting!</p>
      <div class="share-invite">
        <p><strong>Invite others:</strong></p>
        <div class="invite-link">
          <input type="text" value="${window.location.origin}${window.location.pathname}?room=${roomId}" readonly>
          <button class="btn-copy-link" onclick="copyInviteLink(this)">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(welcomeMessage);
    scrollToBottom();
  }

  // Copy invite link
  window.copyInviteLink = async function(button) {
    const input = button.previousElementSibling;
    try {
      await navigator.clipboard.writeText(input.value);
      button.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-copy"></i> Copy';
      }, 2000);
    } catch (err) {
      input.select();
      document.execCommand('copy');
      button.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-copy"></i> Copy';
      }, 2000);
    }
  };

  // Handle sending message
  async function handleSendMessage() {
    const messageInput = document.getElementById('message-input');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: uname,
          message: message,
          room: roomId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        renderMessage("my", {
          name: uname,
          message: message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        messageInput.value = '';
        scrollToBottom();
      } else {
        showNotification('Failed to send message', 'error');
      }
    } catch (error) {
      console.error('Send message error:', error);
      showNotification('Failed to send message', 'error');
    }
  }

  // Handle exit chat
  async function handleExitChat() {
    if (confirm('Are you sure you want to leave the chat?')) {
      try {
        await fetch('/api/leave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: uname,
            room: roomId,
          }),
        });
      } catch (error) {
        console.error('Leave error:', error);
      }
      
      stopPolling();
      showScreen('welcome');
      clearMessages();
      
      // Update URL
      window.history.pushState({}, '', window.location.pathname);
    }
  }

  // Share modal functions
  function openShareModal() {
    const modal = document.getElementById('share-modal');
    const shareLink = document.getElementById('modal-share-link');
    
    if (modal && shareLink) {
      const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      shareLink.value = link;
      modal.classList.add('active');
    }
  }

  function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  async function copyShareLinkToClipboard() {
    const shareLink = document.getElementById('modal-share-link');
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink.value);
        showNotification('Link copied to clipboard!', 'success');
      } catch (err) {
        shareLink.select();
        document.execCommand('copy');
        showNotification('Link copied to clipboard!', 'success');
      }
    }
  }

  // Polling for messages
  function startPolling() {
    if (pollInterval) return;
    
    pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/messages?since=${lastMessageTimestamp}&room=${roomId}`);
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(message => {
            if (message.type === 'chat' && message.name !== uname) {
              renderMessage("other", message);
            } else if (message.type === 'update') {
              renderMessage("update", { message: message.text });
            }
          });
          lastMessageTimestamp = data.timestamp;
        }
        
        if (!isConnected) {
          isConnected = true;
          updateConnectionStatus('Connected', 'success');
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (isConnected) {
          isConnected = false;
          updateConnectionStatus('Connection Error', 'error');
        }
      }
    }, 1000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Update connection status
  function updateConnectionStatus(message, type) {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = message;
      const statusIcon = statusText.parentElement.querySelector('.status-dot');
      if (statusIcon) {
        statusIcon.style.color = type === 'success' ? '#06d755' : '#ea4335';
      }
    }
  }

  // Render messages
  function renderMessage(type, data) {
    const messagesContainer = document.getElementById('messages-area');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    
    if (type === 'update') {
      messageDiv.className = 'update';
      messageDiv.textContent = data.message || data;
    } else {
      messageDiv.className = `message ${type}-message`;
      
      const messageContent = document.createElement('div');
      
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
    scrollToBottom();
  }

  // Clear messages
  function clearMessages() {
    const messagesContainer = document.getElementById('messages-area');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }

  // Scroll to bottom
  function scrollToBottom() {
    const messagesContainer = document.getElementById('messages-area');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
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
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 9999;
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
    }, 3000);
  }

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
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
