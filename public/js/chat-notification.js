/**
 * Chat Notification Helper
 * Handles notifications for new messages using SweetAlert2
 */

class ChatNotificationHelper {
  constructor() {
    // Initialize notification sound
    this.notificationSound = new Audio('/sounds/notification.mp3');
    
    // Track page visibility
    this.isPageVisible = true;
    this.unreadMessagesCount = 0;
    this.originalTitle = document.title;
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  /**
   * Handle visibility change events
   */
  handleVisibilityChange() {
    this.isPageVisible = document.visibilityState === 'visible';
    
    // If page becomes visible, reset unread count and title
    if (this.isPageVisible && this.unreadMessagesCount > 0) {
      this.resetUnreadCount();
    }
  }
  
  /**
   * Reset unread count and page title
   */
  resetUnreadCount() {
    this.unreadMessagesCount = 0;
    document.title = this.originalTitle;
  }
  
  /**
   * Play notification sound
   */
  playSound() {
    try {
      this.notificationSound.play();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  /**
   * Show toast notification for new message
   * @param {string} message - Message content
   * @param {string} senderName - Name of message sender
   */
  showNotification(message, senderName) {
    // Only show notification if page is not visible
    if (!this.isPageVisible) {
      // Update page title to show unread count
      this.unreadMessagesCount++;
      document.title = `(${this.unreadMessagesCount}) رسالة جديدة | ${this.originalTitle}`;
      
      // Show notification using SweetAlert2
      Swal.fire({
        title: 'رسالة جديدة',
        text: `${senderName}: ${message}`,
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
          toast.addEventListener('click', () => {
            window.focus();
            Swal.close();
          });
        }
      });
    }
  }
  
  /**
   * Handle new message - play sound and show notification if needed
   * @param {Object} message - Message object
   * @param {boolean} needsNotification - Whether to show notification
   */
  handleNewMessage(message, needsNotification = true) {
    // Always play sound for new messages
    this.playSound();
    
    // Show notification if needed
    if (needsNotification) {
      this.showNotification(message.message, message.sender_name);
    }
  }
}

// Create global instance
window.chatNotification = new ChatNotificationHelper(); 