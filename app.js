const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const dotenv = require('dotenv');
const http = require('http');
const socketIoModule = require('./config/socket');
const expressLayouts = require('express-ejs-layouts');
const fileUpload = require('express-fileupload');
const i18nMiddleware = require('./middleware/i18n');
const { injectOnlineStatus } = require('./middleware/onlineStatusMiddleware');
const { activateSession } = require('./middleware/sessionActivation');
const { restrictPsychologistAccess } = require('./middleware/auth');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIoModule.initializeSocket(server);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Setup express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Make path and user info accessible to views
app.use((req, res, next) => {
  // Only pass specific properties from req to avoid circular references
  res.locals.path = req.path;
  res.locals.url = req.url;
  res.locals.originalUrl = req.originalUrl;
  next();
});
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './database' }),
  secret: process.env.SESSION_SECRET || 'raha_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Middleware to make user data and request object available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.req = req;
  next();
});

// Apply psychologist access restrictions
app.use(restrictPsychologistAccess);

// Internationalization middleware
app.use(i18nMiddleware);

// Online status middleware - inject online status for conversation objects
app.use('/psychologist/messages', injectOnlineStatus);
app.use('/support/conversation', injectOnlineStatus);

// Routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const surveyRouter = require('./routes/survey');
const supportRouter = require('./routes/support');
const sessionsRouter = require('./routes/sessions');
const trainingRouter = require('./routes/training');
const communityRouter = require('./routes/community');
const psychologistRouter = require('./routes/psychologist');
const apiRouter = require('./routes/api');

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/survey', surveyRouter);
app.use('/support', supportRouter);
app.use('/sessions', sessionsRouter);
app.use('/training', trainingRouter);
app.use('/community', communityRouter);
app.use('/psychologist', psychologistRouter);
app.use('/api', apiRouter);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('pages/error', {
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Socket.io has been initialized in config/socket.js
const SupportMessage = require('./models/SupportMessage');
const User = require('./models/User');

// Get the connected users map from the socket module
const { onlineUsers } = socketIoModule;

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Raha server running on port ${PORT}`);
});

module.exports = { app, server, io };
// This section has been moved to config/socket.js
/*  socket.on('register-user', async (data) => {
    try {
      const { userId, userRole, currentPage, conversationId } = data;
      
      if (!userId) {
        return socket.emit('error', { message: 'Missing user ID' });
      }
      
      // Store user information
      userData.userId = userId;
      userData.userRole = userRole || 'employee';
      userData.currentPage = currentPage || 'other';
      userData.conversationId = conversationId || null;
      
      // Add user to connected users map
      connectedUsers.set(userId, {
        socketId: socket.id,
        userRole: userData.userRole,
        currentPage: userData.currentPage,
        conversationId: userData.conversationId,
        isOnline: true
      });
      
      console.log(`User ${userId} (${userRole}) registered on page: ${currentPage}`);
      
      // Join user's personal room for direct messages
      socket.join(`user-${userId}`);
      
      // If in a conversation, join the conversation room
      if (conversationId) {
        socket.join(`conversation-${conversationId}`);
      }
      
      // Emit online status to potential conversation partners
      if (userData.userRole === 'employee') {
        // Notify all psychologists
        const psychologists = await User.getAllPsychologists();
        psychologists.forEach(psychologist => {
          io.to(`user-${psychologist.id}`).emit('user-status-change', {
            userId: userId,
            isOnline: true
          });
        });
      } else if (userData.userRole === 'psychologist') {
        // Notify all employees or specific employee if in conversation
        if (conversationId) {
          io.to(`user-${conversationId}`).emit('user-status-change', {
            userId: userId,
            isOnline: true
          });
        }
      }
      
      // Confirm registration to the user
      socket.emit('user-registered', { 
        userId, 
        userRole: userData.userRole,
        currentPage: userData.currentPage,
        conversationId: userData.conversationId
      });
    } catch (error) {
      console.error(`Error in register-user: ${error.message}`);
      socket.emit('error', { message: 'Failed to register for messaging' });
    }
  });
  
  // Page change notification
  socket.on('page-change', (data) => {
    try {
      const { page, conversationId } = data;
      
      if (!userData.userId) {
        return;
      }
      
      // Leave previous conversation room if any
      if (userData.conversationId) {
        socket.leave(`conversation-${userData.conversationId}`);
      }
      
      // Update user data
      userData.currentPage = page;
      userData.conversationId = conversationId || null;
      
      // Update connected users map
      if (connectedUsers.has(userData.userId)) {
        const userInfo = connectedUsers.get(userData.userId);
        userInfo.currentPage = page;
        userInfo.conversationId = conversationId || null;
        connectedUsers.set(userData.userId, userInfo);
      }
      
      // Join new conversation room if any
      if (conversationId) {
        socket.join(`conversation-${conversationId}`);
      }
      
      console.log(`User ${userData.userId} changed page to: ${page}`);
    } catch (error) {
      console.error(`Error in page-change: ${error.message}`);
    }
  });
  
  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { receiverId, message, conversationId } = data;
      
      if (!userData.userId || !receiverId || !message) {
        return socket.emit('error', { message: 'Missing required parameters' });
      }
      
      // Create message in database
      const messageData = {
        sender_id: userData.userId,
        receiver_id: parseInt(receiverId),
        message: message
      };
      
      const newMessage = await SupportMessage.create(messageData);
      
      // Get sender info
      const sender = await User.findById(userData.userId);
      
      // Format message for frontend
      const formattedMessage = {
        id: newMessage.id,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        message: newMessage.message,
        is_read: newMessage.is_read,
        created_at: newMessage.created_at,
        sender_name: `${sender.first_name} ${sender.last_name}`,
        time: new Date(newMessage.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      };
      
      // Confirm to sender
      socket.emit('message-sent', formattedMessage);
      
      // Check if receiver is online and determine if they need notification
      const receiverInfo = connectedUsers.get(receiverId.toString());
      
      // Determine whether to send notification based on the user's current page
      let needsNotification = true;
      
      if (receiverInfo) {
        const senderRole = userData.userRole;
        const receiverRole = receiverInfo.userRole;
        
        if (receiverRole === 'employee' && senderRole === 'psychologist') {
          // Employee should get notification if not on specific psychologist conversation
          needsNotification = receiverInfo.currentPage !== 'conversation' || 
                             receiverInfo.conversationId !== userData.userId.toString();
        } else if (receiverRole === 'psychologist' && senderRole === 'employee') {
          // Psychologist should get notification if not on specific employee conversation
          needsNotification = receiverInfo.currentPage !== 'conversation' ||
                             receiverInfo.conversationId !== userData.userId.toString();
        }
      }
      
      // Send to receiver
      io.to(`user-${receiverId}`).emit('new-message', {
        ...formattedMessage,
        needsNotification
      });
      
      console.log(`Message sent from ${userData.userId} to ${receiverId}`);
    } catch (error) {
      console.error(`Error sending message: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Typing indicators
  socket.on('typing', (data) => {
    const { receiverId } = data;
    
    if (!userData.userId || !receiverId) {
      return;
    }
    
    io.to(`user-${receiverId}`).emit('user-typing', { 
      userId: userData.userId
    });
  });
  
  socket.on('stop-typing', (data) => {
    const { receiverId } = data;
    
    if (!userData.userId || !receiverId) {
      return;
    }
    
    io.to(`user-${receiverId}`).emit('user-stop-typing', { 
      userId: userData.userId 
    });
  });
  
  // Mark messages as read
  socket.on('mark-messages-read', async (data) => {
    try {
      const { senderId } = data;
      
      if (!userData.userId || !senderId) {
        return;
      }
      
      // Mark messages as read in the database
      await SupportMessage.markConversationAsRead(senderId, userData.userId);
      
      // Notify sender that messages were read
      io.to(`user-${senderId}`).emit('messages-read', {
        by: userData.userId
      });
      
    } catch (error) {
      console.error(`Error marking messages as read: ${error.message}`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('Socket disconnected:', socket.id);
    
    if (userData.userId) {
      // Update connected users map
      connectedUsers.delete(userData.userId);
      
      // Notify relevant users about status change
      try {
        if (userData.userRole === 'employee') {
          // Notify all psychologists
          const psychologists = await User.getAllPsychologists();
          psychologists.forEach(psychologist => {
            io.to(`user-${psychologist.id}`).emit('user-status-change', {
              userId: userData.userId,
              isOnline: false
            });
          });
        } else if (userData.userRole === 'psychologist') {
          // Notify relevant employees
          const messages = await SupportMessage.getMessagesForUser(userData.userId);
          const employeeIds = new Set();
          
          messages.forEach(message => {
            const otherUserId = message.sender_id === userData.userId ? message.receiver_id : message.sender_id;
            employeeIds.add(otherUserId);
          });
          
          // Notify each employee
          employeeIds.forEach(employeeId => {
            io.to(`user-${employeeId}`).emit('user-status-change', {
              userId: userData.userId,
              isOnline: false
            });
          });
        }
      } catch (error) {
        console.error(`Error in disconnect notification: ${error.message}`);
      }
    }
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

*/
