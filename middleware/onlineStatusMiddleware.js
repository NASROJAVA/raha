// Online Status Middleware
// This middleware injects online status information into conversation objects

const socketManager = require('../config/socket');

/**
 * Middleware that adds online status to conversation objects
 * This should be used in routes that render pages with conversation lists
 */
const injectOnlineStatus = (req, res, next) => {
  // Store the original render function
  const originalRender = res.render;
  
  // Override the render function
  res.render = function(view, options) {
    // If there are conversations in the options
    if (options && options.conversations && Array.isArray(options.conversations)) {
      // Add online status to each conversation
      options.conversations = options.conversations.map(conversation => {
        if (conversation.userId) {
          // Use socketManager to check if user is online
          const isOnline = socketManager.isUserOnline(conversation.userId);
          console.log(`User ${conversation.userId} online status: ${isOnline}`);
          
          // Return conversation with added isOnline property
          return {
            ...conversation,
            isOnline: isOnline
          };
        }
        return conversation;
      });
    }
    
    // Call the original render function
    originalRender.call(this, view, options);
  };
  
  next();
};

module.exports = {
  injectOnlineStatus
};
