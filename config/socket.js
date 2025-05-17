const socketIo = require('socket.io');
const SupportMessage = require('../models/SupportMessage');
const SessionMessage = require('../models/SessionMessage');

// Store online users, active sessions, and session participants
const onlineUsers = new Map();
const activeSessions = new Map();
const sessionParticipants = new Map();

function initializeSocket(server) {
  const io = socketIo(server);
  
  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Handle session join
    socket.on('join-session', (data) => {
      // Fix possible inconsistency in parameter names
      const sessionId = data.sessionId;
      const userId = data.userId;
      const userRole = data.userRole || data.role; // Accept either userRole or role
      
      console.log(`User ${userId} (${userRole}) joining session ${sessionId}`);
      
      // Join the session room
      const roomId = `session-${sessionId}`;
      socket.join(roomId);
      
      // Track participant
      if (!sessionParticipants.has(sessionId)) {
        sessionParticipants.set(sessionId, new Set());
      }
      sessionParticipants.get(sessionId).add(userId);
      
      // Add to active sessions map
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, new Set());
      }
      activeSessions.get(sessionId).add(userId);
      
      console.log(`User ${userId} (${userRole}) joined session room: ${roomId}`);
      console.log(`Session participants: ${JSON.stringify(Array.from(sessionParticipants.get(sessionId)))}`);
      
      // Emit to the user that they successfully joined
      socket.emit('joined-session', { 
        success: true, 
        roomId: roomId 
      });
      
      // Notify other participants
      socket.to(roomId).emit('user-joined-session', {
        sessionId,
        userId,
        userRole
      });
      
      // Critical: After joining, also check if there are other participants in the room
      // and notify the current user about them
      const currentParticipants = Array.from(sessionParticipants.get(sessionId) || []);
      console.log(`Current participants in session ${sessionId}: ${JSON.stringify(currentParticipants)}`);
      
      currentParticipants.forEach(participantId => {
        // Don't notify about self
        if (participantId !== userId.toString()) {
          // Determine the other participant's role
          const otherRole = userRole === 'psychologist' ? 'employee' : 'psychologist';
          
          console.log(`Notifying ${userId} about other participant: ${participantId} (${otherRole})`);
          
          // Send information about the other participant to the current user
          socket.emit('user-joined-session', {
            sessionId,
            userId: participantId,
            userRole: otherRole
          });
        }
      });
      
      // If this user is psychologist and there's an employee already in the session,
      // or if this user is employee and there's a psychologist already in the session,
      // trigger connection by emitting the event to this socket
      const participants = Array.from(sessionParticipants.get(sessionId));
      if (participants.length > 1) {
        // Get the other participant
        const otherUserId = participants.find(id => id !== userId.toString());
        if (otherUserId) {
          console.log(`Notifying ${userId} about other participant: ${otherUserId}`);
          socket.emit('user-joined-session', {
            sessionId,
            userId: otherUserId,
            userRole: userRole === 'psychologist' ? 'employee' : 'psychologist'
          });
        }
      }
    });
    
    // Handle session leave
    socket.on('leave-session', (data) => {
      const { sessionId, userId, userRole } = data;
      console.log(`User ${userId} (${userRole}) leaving session ${sessionId}`);
      
      // Leave the session room
      socket.leave(`session-${sessionId}`);
      
      // Remove from tracking
      if (sessionParticipants.has(sessionId)) {
        sessionParticipants.get(sessionId).delete(userId);
        if (sessionParticipants.get(sessionId).size === 0) {
          sessionParticipants.delete(sessionId);
        }
      }
      
      // Notify other participants
      socket.to(`session-${sessionId}`).emit('user-left-session', {
        sessionId,
        userId,
        userRole
      });
    });
    
    // Register user
    socket.on('register-user', (userData) => {
      console.log(`User registered: ${userData.userId}, role: ${userData.userRole}`);
      
      // Store user data
      onlineUsers.set(userData.userId.toString(), {
        socketId: socket.id,
        role: userData.userRole,
        lastSeen: new Date()
      });
      
      // If psychologist logged in, broadcast to all clients
      if (userData.userRole === 'psychologist') {
        io.emit('psychologist-status-change', {
          psychologistId: userData.userId,
          isOnline: true
        });
      }
    });
    
    // Handle explicit chat room joining
    socket.on('join-chat', (data) => {
      try {
        if (data.senderId && data.receiverId) {
          const roomId = getChatRoomId(data.senderId, data.receiverId);
          console.log(`User ${data.senderId} joining room ${roomId}`);
          socket.join(roomId);
          socket.emit('joined-chat', { 
            success: true, 
            roomId: roomId 
          });
        } else {
          console.error('Missing sender or receiver ID for join-chat');
          socket.emit('error', { message: 'بيانات غير مكتملة لإنضمام المحادثة' });
        }
      } catch (error) {
        console.error('Error joining chat room:', error);
        socket.emit('error', { message: 'حدث خطأ أثناء الإنضمام للمحادثة' });
      }
    });
    
    // Handle session leave
    socket.on('leave-session', (data) => {
      try {
        const { sessionId, userId, userRole } = data;
        console.log(`User ${userId} (${userRole}) leaving session ${sessionId}`);
        
        // Leave the session room
        const roomId = `session-${sessionId}`;
        socket.leave(roomId);
        
        // Remove from tracking
        if (sessionParticipants.has(sessionId)) {
          sessionParticipants.get(sessionId).delete(userId);
          if (sessionParticipants.get(sessionId).size === 0) {
            sessionParticipants.delete(sessionId);
          }
        }
        
        // Remove from active sessions
        if (activeSessions.has(sessionId)) {
          activeSessions.get(sessionId).delete(userId);
          if (activeSessions.get(sessionId).size === 0) {
            activeSessions.delete(sessionId);
          }
        }
        
        // Notify other participants
        socket.to(roomId).emit('user-left-session', {
          sessionId,
          userId,
          userRole
        });
      } catch (error) {
        console.error('Error leaving session room:', error);
        socket.emit('error', { message: 'حدث خطأ أثناء مغادرة الجلسة' });
      }
    });
    
    // New message handler (client-to-server event)
    socket.on('send-message', async (data) => {
      try {
        console.log('Received send-message event:', data);
        
        // Find sender ID if not provided in the data
        let senderId = data.senderId;
        if (!senderId) {
          // Find the user ID associated with this socket
          for (const [userId, userData] of onlineUsers.entries()) {
            if (userData.socketId === socket.id) {
              senderId = userId;
              break;
            }
          }
        }
        
        // Save the message to the database using API call
        const messageData = {
          sender_id: senderId,
          receiver_id: data.receiverId,
          message: data.message
        };
        
        // Add the current time
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        
        // Make sure we have valid sender and receiver IDs
        if (!messageData.sender_id || !messageData.receiver_id) {
          console.error('Missing sender or receiver ID', { 
            sender_id: messageData.sender_id, 
            receiver_id: messageData.receiver_id 
          });
          return;
        }
        
        // Add a database call to save the message
        try {
          const SupportMessage = require('../models/SupportMessage');
          await SupportMessage.create(messageData);
          console.log('Message saved to database');
        } catch (dbError) {
          console.error('Failed to save message to database:', dbError);
          // Continue anyway to attempt real-time delivery
        }

        // Create the chat room ID
        const roomId = getChatRoomId(messageData.sender_id, messageData.receiver_id);
        console.log('Broadcasting to room:', roomId);
        
        // Broadcast message to the room
        socket.to(roomId).emit('new-message', {
          sender_id: messageData.sender_id,
          receiver_id: messageData.receiver_id,
          message: data.message,
          time: formattedTime
        });
        
        console.log(`Message broadcast to room ${roomId}`);
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'حدث خطأ في معالجة الرسالة' });
      }
    });
    
    // Session message handler
    socket.on('session-message', async (data) => {
      try {
        console.log('Received session-message event:', data);
        
        if (!data.sessionId || !data.message) {
          return socket.emit('error', { message: 'بيانات الرسالة غير مكتملة' });
        }
        
        const roomId = `session-${data.sessionId}`;
        
        // Find sender info if not provided
        let senderId = data.senderId;
        let senderRole = data.role;
        if (!senderId) {
          for (const [userId, userData] of onlineUsers.entries()) {
            if (userData.socketId === socket.id) {
              senderId = userId;
              senderRole = userData.role;
              break;
            }
          }
        }
        
        // Create formatted message
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        
        const messageData = {
          sessionId: data.sessionId,
          senderId: senderId,
          role: senderRole,
          message: data.message,
          timestamp: now.toISOString()
        };
        
        // Store message in database
        try {
          await SessionMessage.create(messageData);
          console.log('Session message saved to database');
        } catch (dbError) {
          console.error('Failed to save session message:', dbError);
          // Continue anyway to attempt real-time delivery
        }
        
        // Broadcast to session room
        io.to(roomId).emit('new-session-message', {
          ...messageData,
          formattedTime: formattedTime
        });
        
        console.log(`Session message broadcast to room ${roomId}`);
      } catch (error) {
        console.error('Error processing session message:', error);
        socket.emit('error', { message: 'حدث خطأ في معالجة رسالة الجلسة' });
      }
    });
    
    // WebRTC signaling
    socket.on('webrtc-offer', (data) => {
      try {
        if (!data.sessionId || !data.offer) {
          return socket.emit('error', { message: 'بيانات العرض غير مكتملة' });
        }
        
        const roomId = `session-${data.sessionId}`;
        console.log(`Broadcasting WebRTC offer to room: ${roomId}`);
        
        // Broadcast offer to others in the room
        socket.to(roomId).emit('webrtc-offer', {
          sessionId: data.sessionId,
          offer: data.offer,
          from: data.from
        });
      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
        socket.emit('error', { message: 'حدث خطأ في معالجة عرض الاتصال' });
      }
    });
    
    socket.on('webrtc-answer', (data) => {
      try {
        if (!data.sessionId || !data.answer) {
          return socket.emit('error', { message: 'بيانات الرد غير مكتملة' });
        }
        
        const roomId = `session-${data.sessionId}`;
        console.log(`Broadcasting WebRTC answer to room: ${roomId}`);
        
        // Broadcast answer to others in the room
        socket.to(roomId).emit('webrtc-answer', {
          sessionId: data.sessionId,
          answer: data.answer,
          from: data.from
        });
      } catch (error) {
        console.error('Error handling WebRTC answer:', error);
        socket.emit('error', { message: 'حدث خطأ في معالجة رد الاتصال' });
      }
    });
    
    socket.on('webrtc-ice-candidate', (data) => {
      try {
        if (!data.sessionId || !data.candidate) {
          return socket.emit('error', { message: 'بيانات ICE غير مكتملة' });
        }
        
        const roomId = `session-${data.sessionId}`;
        console.log(`Broadcasting ICE candidate to room: ${roomId}`);
        
        // Broadcast ICE candidate to others in the room
        socket.to(roomId).emit('webrtc-ice-candidate', {
          sessionId: data.sessionId,
          candidate: data.candidate,
          from: data.from
        });
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
        socket.emit('error', { message: 'حدث خطأ في معالجة مرشح الاتصال' });
      }
    });
    
    // Backward compatibility: Keep the old event name too
    socket.on('new-message', async (data) => {
      try {
        const roomId = getChatRoomId(data.senderId, data.receiverId);
        
        // Broadcast message to room
        socket.to(roomId).emit('new-message', {
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message
        });
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('Client disconnected');
      
      // Find the user who disconnected
      for (const [userId, userData] of onlineUsers.entries()) {
        if (userData.socketId === socket.id) {
          console.log(`User disconnected: ${userId}, role: ${userData.role}`);
          
          // Remove user from online users
          onlineUsers.delete(userId);
          
          // If psychologist disconnected, broadcast to all clients
          if (userData.role === 'psychologist') {
            io.emit('psychologist-status-change', {
              psychologistId: parseInt(userId),
              isOnline: false
            });
          }
          
          break;
        }
      }
    });
  });
  
  return io;
}

// Helper function to get a unique chat room ID for two users
function getChatRoomId(user1Id, user2Id) {
  // Sort IDs to ensure the same room ID regardless of who initiates
  const sortedIds = [user1Id, user2Id].sort();
  return `chat-${sortedIds[0]}-${sortedIds[1]}`;
}

// Function to check if a user is online
function isUserOnline(userId) {
  return onlineUsers.has(userId.toString());
}

// Export functions
module.exports = {
  initializeSocket,
  isUserOnline,
  onlineUsers
};
