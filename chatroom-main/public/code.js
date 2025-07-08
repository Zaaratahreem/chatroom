(function() {
    'use strict';
    
    console.log("A2Z Chat JavaScript loaded");

    // Application state
    const app = document.querySelector(".app");
    const socket = io({
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    let uname = '';
    let typingTimer;
    let isTyping = false;
    let userCount = 0;
    let soundEnabled = true;
    let isDarkTheme = false;

    // DOM elements
    const elements = {
        joinScreen: document.getElementById("join-screen"),
        chatScreen: document.getElementById("chat-screen"),
        usernameInput: document.getElementById("username"),
        joinButton: document.getElementById("join-user"),
        messageInput: document.getElementById("message-input"),
        sendButton: document.getElementById("send-message"),
        exitButton: document.getElementById("exit-chat"),
        messagesContainer: document.getElementById("messages"),
        typingIndicator: document.getElementById("typing-indicator"),
        userCountDisplay: document.getElementById("user-count"),
        emojiButton: document.getElementById("emoji-button"),
        emojiPicker: document.getElementById("emoji-picker"),
        attachButton: document.getElementById("attach-button"),
        shareButton: document.getElementById("share-button"),
        toggleThemeButton: document.getElementById("toggle-theme"),
        toggleSoundButton: document.getElementById("toggle-sound"),
        loadingOverlay: document.getElementById("loading-overlay"),
        toastContainer: document.getElementById("toast-container")
    };

    // Initialize app
    function init() {
        console.log("Initializing A2Z Chat...");
        setupEventListeners();
        loadUserPreferences();
        hideLoadingOverlay();
        setupEmojiPicker();
        
        // Initialize user count display
        updateUserCount();
        
        // Focus username input on load
        if (elements.usernameInput) {
            elements.usernameInput.focus();
        }
        
        // Check if socket is connected
        setTimeout(() => {
            if (socket.connected) {
                hideLoadingOverlay();
            } else {
                hideLoadingOverlay();
                showToast("Connection taking longer than expected. Please try refreshing.", "warning");
            }
        }, 3000);
    }

    // Setup all event listeners
    function setupEventListeners() {
        console.log("Setting up event listeners...");
        
        // Join chat
        if (elements.joinButton) {
            elements.joinButton.addEventListener("click", handleJoinChat);
        }
        
        if (elements.usernameInput) {
            elements.usernameInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleJoinChat();
            });
        }

        // Send message
        if (elements.sendButton) {
            elements.sendButton.addEventListener("click", handleSendMessage);
        }

        if (elements.messageInput) {
            elements.messageInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleSendMessage();
            });
            
            // Typing indicator
            elements.messageInput.addEventListener("input", handleTyping);
            elements.messageInput.addEventListener("keydown", handleTyping);
        }

        // Exit chat
        if (elements.exitButton) {
            elements.exitButton.addEventListener("click", handleExitChat);
        }

        // Share button
        if (elements.shareButton) {
            elements.shareButton.addEventListener("click", handleShareChat);
        }

        // Theme toggle
        if (elements.toggleThemeButton) {
            elements.toggleThemeButton.addEventListener("click", toggleTheme);
        }

        // Sound toggle
        if (elements.toggleSoundButton) {
            elements.toggleSoundButton.addEventListener("click", toggleSound);
        }

        // Emoji picker
        if (elements.emojiButton) {
            elements.emojiButton.addEventListener("click", toggleEmojiPicker);
        }

        // Close emoji picker when clicking outside
        document.addEventListener("click", (e) => {
            if (elements.emojiPicker && !elements.emojiPicker.contains(e.target) && e.target !== elements.emojiButton) {
                elements.emojiPicker.classList.remove("show");
            }
        });

        // Attach button (placeholder)
        if (elements.attachButton) {
            elements.attachButton.addEventListener("click", () => {
                showToast("File attachment feature coming soon!", "info");
            });
        }

        // Socket event listeners
        setupSocketListeners();
    }

    // Setup socket event listeners
    function setupSocketListeners() {
        socket.on("connect", () => {
            console.log("Connected to server");
            hideLoadingOverlay();
            showToast("Connected to A2Z Chat!", "success");
        });

        socket.on("disconnect", () => {
            showToast("Disconnected from server", "error");
            showLoadingOverlay();
        });

        socket.on("connect_error", (error) => {
            console.error("Connection error:", error);
            hideLoadingOverlay();
            showToast("Failed to connect to server. Please try refreshing.", "error");
        });

        socket.on("update", (update) => {
            renderMessage("update", update);
        });

        socket.on("chat", (message) => {
            renderMessage("other", message);
            playNotificationSound();
        });

        socket.on("typing", (data) => {
            showTypingIndicator(data.username);
        });

        socket.on("stop-typing", () => {
            hideTypingIndicator();
        });

        socket.on("user-count", (count) => {
            console.log("User count updated:", count);
            userCount = count;
            updateUserCount();
        });

        socket.on("error", (error) => {
            showToast(error.message || "An error occurred", "error");
        });
    }

    // Handle join chat
    function handleJoinChat() {
        const username = elements.usernameInput.value.trim();
        
        if (!username) {
            showToast("Please enter a username", "error");
            elements.usernameInput.focus();
            return;
        }

        if (username.length > 20) {
            showToast("Username must be 20 characters or less", "error");
            return;
        }

        socket.emit("newuser", username);
        uname = username;
        
        // Initialize user count display
        updateUserCount();

        // Switch screens with proper transition
        if (elements.joinScreen && elements.chatScreen) {
            elements.joinScreen.classList.remove("active");
            elements.chatScreen.classList.add("active");
            
            // Focus message input after transition
            setTimeout(() => {
                if (elements.messageInput) {
                    elements.messageInput.focus();
                }
            }, 300);
        }
    }

    // Handle send message
    function handleSendMessage() {
        const message = elements.messageInput.value.trim();
        
        if (!message) {
            return;
        }

        if (message.length > 500) {
            showToast("Message is too long (max 500 characters)", "warning");
            return;
        }

        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const messageData = {
            username: uname,
            text: message,
            time: timestamp,
            id: Date.now()
        };

        renderMessage("my", messageData);
        socket.emit("chat", messageData);
        
        elements.messageInput.value = "";
        stopTyping();
    }

    // Handle typing indicator
    function handleTyping() {
        if (!isTyping) {
            isTyping = true;
            socket.emit("typing", { username: uname });
        }

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            stopTyping();
        }, 1000);
    }

    // Stop typing
    function stopTyping() {
        if (isTyping) {
            isTyping = false;
            socket.emit("stop-typing");
        }
    }

    // Handle share chat
    function handleShareChat() {
        const chatUrl = window.location.origin;
        const shareData = {
            title: 'A2Z Chat',
            text: 'Join me in A2Z Chat for real-time messaging!',
            url: chatUrl
        };

        // Check if Web Share API is supported
        if (navigator.share) {
            navigator.share(shareData)
                .then(() => {
                    showToast('Shared successfully!', 'success');
                })
                .catch((error) => {
                    console.error('Error sharing:', error);
                    fallbackShare(chatUrl);
                });
        } else {
            // Fallback to clipboard copy
            fallbackShare(chatUrl);
        }
    }

    // Fallback share function
    function fallbackShare(url) {
        // Try to copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    showShareModal(url);
                })
                .catch(() => {
                    showShareModal(url);
                });
        } else {
            // Fallback for older browsers
            showShareModal(url);
        }
    }

    // Show share modal
    function showShareModal(url) {
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        modal.innerHTML = `
            <div class="share-modal-content">
                <div class="share-header">
                    <h3>Share A2Z Chat</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="share-body">
                    <p>Share this link with your friends to join the chat:</p>
                    <div class="share-url">
                        <input type="text" value="${url}" readonly id="share-url-input">
                        <button onclick="copyShareUrl()" class="copy-btn">
                            <i class="fas fa-copy"></i>
                            Copy
                        </button>
                    </div>
                    <div class="share-buttons">
                        <button onclick="shareToWhatsApp('${url}')" class="share-btn whatsapp">
                            <i class="fab fa-whatsapp"></i>
                            WhatsApp
                        </button>
                        <button onclick="shareToTelegram('${url}')" class="share-btn telegram">
                            <i class="fab fa-telegram"></i>
                            Telegram
                        </button>
                        <button onclick="shareToEmail('${url}')" class="share-btn email">
                            <i class="fas fa-envelope"></i>
                            Email
                        </button>
                        <button onclick="shareToTwitter('${url}')" class="share-btn twitter">
                            <i class="fab fa-twitter"></i>
                            Twitter
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        showToast('Chat link copied to clipboard!', 'success');
    }

    // Global share functions
    window.copyShareUrl = function() {
        const input = document.getElementById('share-url-input');
        input.select();
        input.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            showToast('Link copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy link', 'error');
        }
    };

    window.shareToWhatsApp = function(url) {
        const text = encodeURIComponent(`Join me in A2Z Chat for real-time messaging! ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    window.shareToTelegram = function(url) {
        const text = encodeURIComponent(`Join me in A2Z Chat for real-time messaging!`);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
    };

    window.shareToEmail = function(url) {
        const subject = encodeURIComponent('Join A2Z Chat');
        const body = encodeURIComponent(`Hi!\n\nI'd like to invite you to join A2Z Chat for real-time messaging.\n\nClick here to join: ${url}\n\nSee you there!`);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    };

    window.shareToTwitter = function(url) {
        const text = encodeURIComponent(`Join me in A2Z Chat for real-time messaging!`);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
    };

    // Handle exit chat
    function handleExitChat() {
        if (confirm("Are you sure you want to leave the chat?")) {
            socket.emit("exituser", uname);
            
            // Reset state
            uname = '';
            elements.messagesContainer.innerHTML = '';
            elements.messageInput.value = '';
            elements.usernameInput.value = '';
            
            // Switch back to join screen
            if (elements.chatScreen && elements.joinScreen) {
                elements.chatScreen.classList.remove("active");
                elements.joinScreen.classList.add("active");
                
                // Focus username input after transition
                setTimeout(() => {
                    if (elements.usernameInput) {
                        elements.usernameInput.focus();
                    }
                }, 300);
            }
        }
    }

    // Render message
    function renderMessage(type, message) {
        const messageElement = document.createElement("div");
        
        if (type === "my") {
            messageElement.className = "message my-message";
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="text-content">
                        <div class="name">YOU</div>
                        <div class="text">${escapeHtml(message.text)}</div>
                    </div>
                    <div class="time">${message.time}</div>
                </div>
            `;
        } else if (type === "other") {
            messageElement.className = "message other-message";
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="text-content">
                        <div class="name">${escapeHtml(message.username)}</div>
                        <div class="text">${escapeHtml(message.text)}</div>
                    </div>
                    <div class="time">${message.time}</div>
                </div>
            `;
        } else if (type === "update") {
            messageElement.className = "message update-message";
            messageElement.innerHTML = `
                <div class="message-content">
                    ${escapeHtml(message)}
                </div>
            `;
        }

        elements.messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }

    // Show typing indicator
    function showTypingIndicator(username) {
        elements.typingIndicator.querySelector(".typing-text").textContent = `${username} is typing...`;
        elements.typingIndicator.classList.add("show");
        scrollToBottom();
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        elements.typingIndicator.classList.remove("show");
    }

    // Update user count
    function updateUserCount() {
        const count = userCount || 0;
        const text = `${count} user${count !== 1 ? 's' : ''} online`;
        console.log("Updating user count:", text);
        if (elements.userCountDisplay) {
            elements.userCountDisplay.textContent = text;
        }
    }

    // Scroll to bottom of messages
    function scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    // Setup emoji picker
    function setupEmojiPicker() {
        const emojiOptions = elements.emojiPicker.querySelectorAll(".emoji-option");
        emojiOptions.forEach(emoji => {
            emoji.addEventListener("click", () => {
                elements.messageInput.value += emoji.textContent;
                elements.messageInput.focus();
                elements.emojiPicker.classList.remove("show");
            });
        });
    }

    // Toggle emoji picker
    function toggleEmojiPicker() {
        elements.emojiPicker.classList.toggle("show");
    }

    // Toggle theme
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        document.body.setAttribute("data-theme", isDarkTheme ? "dark" : "light");
        
        const icon = elements.toggleThemeButton.querySelector("i");
        icon.className = isDarkTheme ? "fas fa-sun" : "fas fa-moon";
        
        saveUserPreferences();
        showToast(`Switched to ${isDarkTheme ? 'dark' : 'light'} theme`, "success");
    }

    // Toggle sound
    function toggleSound() {
        soundEnabled = !soundEnabled;
        
        const icon = elements.toggleSoundButton.querySelector("i");
        icon.className = soundEnabled ? "fas fa-volume-up" : "fas fa-volume-mute";
        
        saveUserPreferences();
        showToast(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`, "success");
    }

    // Play notification sound
    function playNotificationSound() {
        if (!soundEnabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    }

    // Show toast notification
    function showToast(message, type = "info") {
        // Create toast container if it doesn't exist
        if (!elements.toastContainer) {
            const container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            document.body.appendChild(container);
            elements.toastContainer = container;
        }
        
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
            </div>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // Show loading overlay
    function showLoadingOverlay() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.remove("hidden");
        }
    }

    // Hide loading overlay
    function hideLoadingOverlay() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add("hidden");
        }
    }

    // Save user preferences
    function saveUserPreferences() {
        const preferences = {
            theme: isDarkTheme ? "dark" : "light",
            soundEnabled: soundEnabled
        };
        localStorage.setItem("a2z-chat-preferences", JSON.stringify(preferences));
    }

    // Load user preferences
    function loadUserPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem("a2z-chat-preferences"));
            if (preferences) {
                isDarkTheme = preferences.theme === "dark";
                soundEnabled = preferences.soundEnabled !== false;
                
                // Apply theme
                document.body.setAttribute("data-theme", isDarkTheme ? "dark" : "light");
                
                if (elements.toggleThemeButton) {
                    const themeIcon = elements.toggleThemeButton.querySelector("i");
                    if (themeIcon) {
                        themeIcon.className = isDarkTheme ? "fas fa-sun" : "fas fa-moon";
                    }
                }
                
                if (elements.toggleSoundButton) {
                    const soundIcon = elements.toggleSoundButton.querySelector("i");
                    if (soundIcon) {
                        soundIcon.className = soundEnabled ? "fas fa-volume-up" : "fas fa-volume-mute";
                    }
                }
            }
        } catch (error) {
            console.log("Could not load user preferences:", error);
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize the application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showToast("An unexpected error occurred", "error");
    });

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopTyping();
        }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (uname) {
            socket.emit("exituser", uname);
        }
    });

})();
