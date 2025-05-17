/**
 * Notifications.js - Handles real-time notifications and messaging using Socket.io
 */

const NotificationSystem = {
  // Socket.io instance
  socket: null,
  
  // User information
  userId: null,
  userRole: null,
  currentPage: null,
  conversationId: null,
  
  // Debug mode
  debug: false,
  
  // Notification sound
  notificationSound: null,
  
  /**
   * Initialize the notification system
   * @param {Object} options - Configuration options
   */
  init: function(options = {}) {
    // Get user information from data attributes or options
    this.userId = options.userId || document.body.getAttribute('data-user-id');
    this.userRole = options.userRole || document.body.getAttribute('data-user-role');
    this.currentPage = options.currentPage || 'other';
    this.conversationId = options.conversationId || null;
    this.debug = options.debug || false;
    
    if (!this.userId) {
      this.log('User ID is required for notifications');
      return false;
    }
    
    // Initialize notification sound
    this.initNotificationSound();
    
    // Initialize Socket.io connection
    this.initSocketConnection();
    
    // Register event listeners
    this.registerSocketEvents();
    
    // Create debug panel if debug mode is enabled
    if (this.debug) {
      this.createDebugPanel();
    }
    
    this.log('Notification system initialized for user: ' + this.userId);
    return true;
  },
  
  /**
   * Initialize notification sound
   */
  initNotificationSound: function() {
    try {
      this.notificationSound = new Audio('/sounds/notification.mp3');
    } catch (error) {
      this.log('Error initializing notification sound: ' + error.message);
    }
  },
  
  /**
   * Initialize Socket.io connection
   */
  initSocketConnection: function() {
    try {
      // Initialize Socket.io with reconnection options
      this.socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
      
      this.log('Socket.io initialized');
    } catch (error) {
      this.log('Error initializing Socket.io: ' + error.message);
    }
  },
  
  /**
   * Register Socket.io event listeners
   */
  registerSocketEvents: function() {
    if (!this.socket) {
      this.log('Socket.io not initialized');
      return;
    }
    
    // Connection events
    this.socket.on('connect', () => {
      this.log('Connected to server with ID: ' + this.socket.id);
      
      // Register user with socket server
      this.socket.emit('register-user', {
        userId: this.userId,
        userRole: this.userRole,
        currentPage: this.currentPage,
        conversationId: this.conversationId
      });
    });
    
    this.socket.on('disconnect', () => {
      this.log('Disconnected from server');
    });
    
    this.socket.on('connect_error', (error) => {
      this.log('Connection error: ' + error.message);
    });
    
    // User registration confirmation
    this.socket.on('user-registered', (data) => {
      this.log('User registered with socket server: ' + JSON.stringify(data));
    });
    
    // New message notification
    this.socket.on('new-message', (message) => {
      this.log('New message received: ' + JSON.stringify(message));
      
      // If the message needs a notification (user not in conversation)
      if (message.needsNotification) {
        this.showMessageNotification(message);
      }
    });
    
    // Error handling
    this.socket.on('error', (error) => {
      this.log('Socket error: ' + JSON.stringify(error));
    });
  },
  
  /**
   * Update the current page and conversation ID
   * @param {string} page - The current page
   * @param {string|null} conversationId - The current conversation ID
   */
  updatePageState: function(page, conversationId = null) {
    this.currentPage = page;
    this.conversationId = conversationId;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('page-change', {
        page: page,
        conversationId: conversationId
      });
      
      this.log('Page state updated: ' + page + (conversationId ? ', conversation: ' + conversationId : ''));
    }
  },
  
  /**
   * Send a message
   * @param {string} receiverId - The recipient's user ID
   * @param {string} message - The message text
   * @param {string|null} conversationId - The conversation ID
   */
  sendMessage: function(receiverId, message, conversationId = null) {
    if (!this.socket || !this.socket.connected) {
      this.log('Socket not connected, cannot send message');
      return false;
    }
    
    if (!receiverId || !message) {
      this.log('Receiver ID and message are required');
      return false;
    }
    
    this.socket.emit('send-message', {
      receiverId: receiverId,
      message: message,
      conversationId: conversationId || this.conversationId
    });
    
    this.log('Message sent to: ' + receiverId);
    return true;
  },
  
  /**
   * Send typing indicator
   * @param {string} receiverId - The recipient's user ID
   * @param {boolean} isTyping - Whether the user is typing or stopped typing
   */
  sendTypingIndicator: function(receiverId, isTyping = true) {
    if (!this.socket || !this.socket.connected || !receiverId) {
      return false;
    }
    
    const eventName = isTyping ? 'typing' : 'stop-typing';
    this.socket.emit(eventName, { receiverId });
    return true;
  },
  
  /**
   * Show a notification for a new message
   * @param {Object} message - The message object
   */
  showMessageNotification: function(message) {
    // Play notification sound
    this.playNotificationSound();
    
    // Get sender name
    const senderName = message.sender_name || 'مستخدم';
    
    // Use SweetAlert2 if available, otherwise use native alert
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'رسالة جديدة من ' + senderName,
        text: message.message,
        icon: 'info',
        confirmButtonText: 'عرض المحادثة',
        showCancelButton: true,
        cancelButtonText: 'إغلاق',
        timer: 10000,
        timerProgressBar: true
      }).then((result) => {
        if (result.isConfirmed) {
          // Navigate to conversation
          const conversationUrl = this.userRole === 'psychologist' 
            ? `/psychologist/messages/${message.sender_id}` 
            : `/support/conversation/${message.sender_id}`;
          window.location.href = conversationUrl;
        }
      });
    } else {
      // Fallback to browser notification API
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          const notification = new Notification('رسالة جديدة من ' + senderName, {
            body: message.message,
            icon: '/images/logo.png'
          });
          
          notification.onclick = function() {
            const conversationUrl = this.userRole === 'psychologist' 
              ? `/psychologist/messages/${message.sender_id}` 
              : `/support/conversation/${message.sender_id}`;
            window.location.href = conversationUrl;
          };
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              this.showMessageNotification(message);
            }
          });
        }
      } else {
        // Fallback to alert
        const goToConversation = confirm('رسالة جديدة من ' + senderName + ':\n' + message.message + '\n\nهل تريد الانتقال إلى المحادثة؟');
        if (goToConversation) {
          const conversationUrl = this.userRole === 'psychologist' 
            ? `/psychologist/messages/${message.sender_id}` 
            : `/support/conversation/${message.sender_id}`;
          window.location.href = conversationUrl;
        }
      }
    }
  },
  
  /**
   * Play notification sound
   */
  playNotificationSound: function() {
    try {
      if (this.notificationSound) {
        this.notificationSound.play();
      }
    } catch (error) {
      this.log('Error playing notification sound: ' + error.message);
    }
  },
  
  /**
   * Create debug panel
   */
  createDebugPanel: function() {
    const debugPanel = document.createElement('div');
    debugPanel.className = 'debug-panel';
    debugPanel.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #0f0; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; max-width: 300px; max-height: 200px; overflow: auto; z-index: 9999; display: none;';
    document.body.appendChild(debugPanel);
    
    // Toggle debug panel with Ctrl+Shift+D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        e.preventDefault();
      }
    });
    
    this.debugPanel = debugPanel;
  },
  
  /**
   * Log a message to the console and debug panel
   * @param {string} message - The message to log
   */
  log: function(message) {
    console.log('[Notifications] ' + message);
    
    if (this.debug && this.debugPanel) {
      const entry = document.createElement('div');
      entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
      this.debugPanel.appendChild(entry);
      this.debugPanel.scrollTop = this.debugPanel.scrollHeight;
    }
  }
};

// Export the notification system
window.NotificationSystem = NotificationSystem;
