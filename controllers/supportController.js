const User = require('../models/User');
const SupportMessage = require('../models/SupportMessage');
const { isUserOnline } = require('../config/socket');

const supportController = {
  // Render inbox
  getInbox: async (req, res) => {
    try {
      const userId = req.session.user.id;
      
      // Get all messages for the user
      const messages = await SupportMessage.getMessagesForUser(userId);
      
      // Get all psychologists
      const psychologists = await User.getAllPsychologists();
      
      // Add online status to each psychologist
      const psychologistsWithStatus = psychologists.map(psychologist => {
        return {
          ...psychologist,
          isOnline: isUserOnline(psychologist.id)
        };
      });
      
      res.render('pages/support/inbox', { 
        title: 'صندوق الرسائل | راحة',
        user: req.session.user,
        messages,
        psychologists: psychologistsWithStatus
      });
    } catch (error) {
      console.error('Support inbox error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل صندوق الرسائل',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get conversation with a psychologist
  getConversation: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const psychologistId = parseInt(req.params.psychologistId);
      
      // Get the psychologist
      const psychologist = await User.findById(psychologistId);
      
      // Check if psychologist exists and is a psychologist
      if (!psychologist || psychologist.role !== 'psychologist') {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على المعالج النفسي',
          error: { status: 404, stack: '' }
        });
      }
      
      // Get conversation between the user and the psychologist
      const conversation = await SupportMessage.getConversation(userId, psychologistId);
      
      // Mark messages from psychologist as read
      await SupportMessage.markConversationAsRead(psychologistId, userId);
      
      res.render('pages/support/conversation', { 
        title: `محادثة مع ${psychologist.first_name} ${psychologist.last_name} | راحة`,
        user: req.session.user,
        psychologist,
        conversation
      });
    } catch (error) {
      console.error('Conversation error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل المحادثة',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Send message
  sendMessage: async (req, res) => {
    try {
      const senderId = req.session.user.id;
      const { receiver_id, message } = req.body;
      
      // Validate input
      if (!receiver_id || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'يرجى إدخال رسالة' 
        });
      }
      
      // Check if receiver exists
      const receiver = await User.findById(parseInt(receiver_id));
      
      if (!receiver) {
        return res.status(400).json({ 
          success: false, 
          message: 'المستلم غير موجود' 
        });
      }
      
      // Create message
      const messageData = {
        sender_id: senderId,
        receiver_id: parseInt(receiver_id),
        message
      };
      
      const newMessage = await SupportMessage.create(messageData);
      
      // Return success response
      res.status(201).json({ 
        success: true, 
        message: 'تم إرسال الرسالة بنجاح', 
        data: newMessage 
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ أثناء إرسال الرسالة' 
      });
    }
  },
  
  // Get all psychologists
  getPsychologists: async (req, res) => {
    try {
      // Get all psychologists
      const psychologists = await User.getAllPsychologists();
      
      // Add online status to each psychologist
      const psychologistsWithStatus = psychologists.map(psychologist => {
        return {
          ...psychologist,
          isOnline: isUserOnline(psychologist.id)
        };
      });
      
      res.render('pages/support/psychologists', { 
        title: 'المعالجين النفسيين | راحة',
        user: req.session.user,
        psychologists: psychologistsWithStatus
      });
    } catch (error) {
      console.error('Get psychologists error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل قائمة المعالجين النفسيين',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Mark messages as read
  markMessagesAsRead: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { senderId } = req.body;
      
      if (!senderId) {
        return res.status(400).json({
          success: false,
          message: 'يرجى توفير معرف المرسل'
        });
      }
      
      // Mark messages as read
      await SupportMessage.markConversationAsRead(parseInt(senderId), userId);
      
      res.status(200).json({
        success: true,
        message: 'تم تحديث حالة الرسائل'
      });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث حالة الرسائل'
      });
    }
  }
};

module.exports = supportController;
