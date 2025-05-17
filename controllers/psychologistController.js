const User = require('../models/User');
const StressSurvey = require('../models/StressSurvey');
const SupportMessage = require('../models/SupportMessage');
const Session = require('../models/Session');
const SessionFeedback = require('../models/SessionFeedback');
const PsychologistAvailability = require('../models/PsychologistAvailability');
const fs = require('fs');
const path = require('path');
const socketManager = require('../config/socket');

const psychologistController = {
  // Render psychologist dashboard
  getDashboard: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get upcoming sessions
      const upcomingSessions = await Session.getUpcomingSessions(psychologistId, 'psychologist');
      
      // Get today's sessions
      const todaySessions = await Session.getTodaySessions(psychologistId, 'psychologist');
      
      // Get completed sessions
      const completedSessions = await Session.getPastSessions(psychologistId, 'psychologist');
      
      // Get unread messages count
      const unreadCount = await SupportMessage.getUnreadCount(psychologistId);
      
      // Get anonymous stress statistics
      const stressStatistics = await StressSurvey.getAnonymousStatistics();
      
      // Get average rating
      const averageRating = await SessionFeedback.getAverageRatingByPsychologistId(psychologistId) || 0;
      
      // Get recent feedback
      const recentFeedback = await SessionFeedback.getRecentFeedback(psychologistId);
      
      // Prepare stats object
      const stats = {
        todaySessions: todaySessions.length,
        completedSessions: completedSessions.length,
        upcomingSessions: upcomingSessions.length,
        averageRating: averageRating
      };
      
      res.render('pages/psychologist/dashboard', { 
        title: 'لوحة التحكم | راحة',
        user: req.session.user,
        upcomingSessions,
        todaySessions,
        recentFeedback,
        unreadCount,
        stressStatistics,
        stats,
        locale: 'ar',
        currentPage: 'dashboard'
      });
    } catch (error) {
      console.error('Psychologist dashboard error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل لوحة التحكم',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get stress statistics page
  getStatisticsPage: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get unread messages count for sidebar
      const unreadCount = await SupportMessage.getUnreadCount(psychologistId);
      
      // Get stress level distribution
      const stressLevelDistribution = await StressSurvey.getStressLevelDistribution();
      
      // Get weekly trend data
      const weeklyTrend = await StressSurvey.getWeeklyTrend();
      
      // Get common stressors
      const stressors = await StressSurvey.getCommonStressors();
      
      // Get demographic distributions
      const genderDistribution = await StressSurvey.getGenderDistribution();
      const maritalDistribution = await StressSurvey.getMaritalDistribution();
      
      res.render('pages/psychologist/statistics', { 
        title: 'إحصائيات الضغط النفسي | راحة',
        user: req.session.user,
        unreadCount,
        stressLevelDistribution,
        weeklyTrend,
        stressors,
        genderDistribution,
        maritalDistribution,
        currentPage: 'statistics'
      });
    } catch (error) {
      console.error('Psychologist statistics error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل إحصائيات الضغط النفسي',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get messages inbox
  getMessages: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get all messages for the psychologist
      const messages = await SupportMessage.getMessagesForUser(psychologistId);
      
      // Group messages by user
      const messagesByUser = {};
      const userIds = new Set();
      
      messages.forEach(message => {
        const otherUserId = message.sender_id === psychologistId ? message.receiver_id : message.sender_id;
        userIds.add(otherUserId);
        
        if (!messagesByUser[otherUserId]) {
          messagesByUser[otherUserId] = [];
        }
        
        messagesByUser[otherUserId].push(message);
      });
      
      // Get user details for each conversation
      const userDetails = {};
      for (const userId of userIds) {
        const user = await User.findById(userId);
      
      // Debug logging
      console.log('DEBUG - Profile Arrays:');
      console.log('Specialties:', user.specialties);
      console.log('Is Array:', Array.isArray(user.specialties));
      console.log('Length:', user.specialties ? user.specialties.length : null);
      console.log('Languages:', user.languages);
      console.log('Is Array:', Array.isArray(user.languages));
      console.log('Length:', user.languages ? user.languages.length : null);
        if (user) {
          userDetails[userId] = user;
        }
      }
      
      // Transform messagesByUser into conversations array for the template
      const conversations = [];
      for (const userId in messagesByUser) {
        if (userDetails[userId]) {
          const messages = messagesByUser[userId];
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(m => m.sender_id == userId && m.is_read === 0).length;
          
          conversations.push({
            userId: userId,
            userName: userDetails[userId].name || `${userDetails[userId].first_name} ${userDetails[userId].last_name}`,
            lastMessage: lastMessage.message,
            lastMessageTime: new Date(lastMessage.created_at).toLocaleString('ar-SA'),
            unreadCount: unreadCount
          });
        }
      }
      
      // Sort conversations by last message time (newest first)
      conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      
      res.render('pages/psychologist/messages', { 
        title: 'الرسائل | راحة',
        user: req.session.user,
        conversations,
        messagesByUser,
        userDetails,
        currentPage: 'messages',
        activeUserId: null
      });
    } catch (error) {
      console.error('Psychologist messages error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل الرسائل',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get conversation with an employee
  getConversation: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      const employeeId = req.params.id;
      
      // Get conversation between psychologist and employee
      const messages = await SupportMessage.getConversation(psychologistId, employeeId);
      
      // Get employee details
      const employee = await User.findById(employeeId);
      
      if (!employee) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على المستخدم',
          error: { status: 404 }
        });
      }
      
      // Mark messages as read
      await SupportMessage.markConversationAsRead(employeeId, psychologistId);
      
      // Get all conversations for sidebar
      const allMessages = await SupportMessage.getMessagesForUser(psychologistId);
      const messagesByUser = {};
      const userIds = new Set();
      
      allMessages.forEach(message => {
        const otherUserId = message.sender_id === psychologistId ? message.receiver_id : message.sender_id;
        userIds.add(otherUserId);
        
        if (!messagesByUser[otherUserId]) {
          messagesByUser[otherUserId] = [];
        }
        
        messagesByUser[otherUserId].push(message);
      });
      
      // Get user details for each conversation
      const userDetails = {};
      for (const userId of userIds) {
        const user = await User.findById(userId);
        if (user) {
          userDetails[userId] = user;
        }
      }
      
      // Transform messagesByUser into conversations array for the template
      const conversations = [];
      for (const userId in messagesByUser) {
        if (userDetails[userId]) {
          const userMessages = messagesByUser[userId];
          const lastMessage = userMessages[userMessages.length - 1];
          const unreadCount = userMessages.filter(m => m.sender_id == userId && m.is_read === 0).length;
          
          conversations.push({
            userId: userId,
            userName: userDetails[userId].name || `${userDetails[userId].first_name} ${userDetails[userId].last_name}`,
            lastMessage: lastMessage.message,
            lastMessageTime: new Date(lastMessage.created_at).toLocaleString('ar-SA'),
            unreadCount: unreadCount
          });
        }
      }
      
      // Sort conversations by last message time (newest first)
      conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      
      res.render('pages/psychologist/conversation', { 
        title: `المحادثة مع ${employee.first_name} ${employee.last_name} | راحة`,
        user: req.session.user,
        messages,
        employee,
        conversations,
        messagesByUser,
        userDetails,
        activeUserId: employeeId,
        activeUser: employee,
        currentPage: 'messages'
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
          message: 'يرجى ملء جميع الحقول' 
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
        message: 'حدث خطأ في إرسال الرسالة' 
      });
    }
  },
  
  // Get sessions list
  getSessions: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get filter parameters from query
      const status = req.query.status || 'all';
      const date = req.query.date || 'all';
      const type = req.query.type || 'all';
      
      // Create filter object
      const filter = {
        status,
        date,
        type
      };
      
      // Get all sessions for the psychologist
      const sessions = await Session.getByPsychologistId(psychologistId);
      
      // Get unread count
      const unreadCount = await SupportMessage.getUnreadCount(psychologistId);
      
      res.render('pages/psychologist/sessions', { 
        title: 'الجلسات | راحة',
        user: req.session.user,
        sessions,
        unreadCount,
        filter, // Pass the filter object to the template
        success: req.query.success,
        error: req.query.error,
        locale: 'ar',
        currentPage: 'sessions'
      });
    } catch (error) {
      console.error('Psychologist sessions error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل الجلسات',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get session details
  getSessionDetails: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const psychologistId = req.session.user.id;
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the psychologist
      if (!session || session.psychologist_id !== psychologistId) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404 }
        });
      }
      
      res.render('pages/psychologist/session-details', { 
        title: 'تفاصيل الجلسة | راحة',
        user: req.session.user,
        session,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Session details error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل تفاصيل الجلسة',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Update session status
  updateSessionStatus: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const psychologistId = req.session.user.id;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['scheduled', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.redirect(`/psychologist/sessions/view/${sessionId}?error=خطأ في حالة الجلسة`);
      }
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the psychologist
      if (!session || session.psychologist_id !== psychologistId) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404 }
        });
      }
      
      // Update session status
      await Session.updateStatus(sessionId, status);
      
      // Redirect to session details
      res.redirect(`/psychologist/sessions/view/${sessionId}?success=تم تحديث حالة الجلسة بنجاح`);
    } catch (error) {
      console.error('Update session status error:', error);
      res.redirect(`/psychologist/sessions/view/${req.params.id}?error=حدث خطأ في تحديث حالة الجلسة`);
    }
  },
  
  // Update session notes
  updateSessionNotes: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const psychologistId = req.session.user.id;
      const { notes } = req.body;
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the psychologist
      if (!session || session.psychologist_id !== psychologistId) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404 }
        });
      }
      
      // Update session notes
      await Session.updateNotes(sessionId, notes);
      
      // Redirect to session details
      res.redirect(`/psychologist/sessions/view/${sessionId}?success=تم تحديث ملاحظات الجلسة بنجاح`);
    } catch (error) {
      console.error('Update session notes error:', error);
      res.redirect(`/psychologist/sessions/view/${req.params.id}?error=حدث خطأ في تحديث ملاحظات الجلسة`);
    }
  },
  
  // Get statistics
  getStatistics: async (req, res) => {
    try {
      // Get anonymous stress statistics
      const stressStatistics = await StressSurvey.getAnonymousStatistics();
      
      // Get session statistics
      const sessionStatistics = await new Promise((resolve, reject) => {
        const query = `SELECT 
                        COUNT(*) as total_sessions,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_sessions,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions
                      FROM sessions 
                      WHERE psychologist_id = ?`;
        
        req.app.locals.db.get(query, [req.session.user.id], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
      
      res.render('pages/psychologist/statistics', { 
        title: 'الإحصائيات | راحة',
        user: req.session.user,
        stressStatistics,
        sessionStatistics
      });
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل الإحصائيات',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get availability page
  getAvailability: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get availability settings
      const availability = await PsychologistAvailability.getByPsychologistId(psychologistId);
      
      // Get blocked dates
      const blockedDates = await PsychologistAvailability.getBlockedDates(psychologistId);
      
      // Get upcoming sessions
      const upcomingSessions = await Session.getUpcomingSessions(psychologistId, 'psychologist');
      
      res.render('pages/psychologist/availability', { 
        title: 'تحديد الأوقات المتاحة | راحة',
        user: req.session.user,
        availability,
        blockedDates,
        upcomingSessions,
        success: req.query.success,
        error: req.query.error,
        locale: 'ar',
        currentPage: 'availability'
      });
    } catch (error) {
      console.error('Availability page error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل صفحة تحديد الأوقات المتاحة',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get appointments management page
  getAppointments: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get upcoming sessions
      const upcomingSessions = await Session.getUpcomingSessions(psychologistId, 'psychologist');
      
      // Get past sessions
      const pastSessions = await Session.getPastSessions(psychologistId, 'psychologist');
      
      // Get availability settings
      const availability = await PsychologistAvailability.getByPsychologistId(psychologistId);
      
      // Get blocked dates
      const blockedDates = await PsychologistAvailability.getBlockedDates(psychologistId);
      
      // Get unread messages count
      const unreadCount = await SupportMessage.getUnreadCount(psychologistId);
      
      res.render('pages/psychologist/appointments', { 
        title: 'إدارة المواعيد | راحة',
        user: req.session.user,
        upcomingSessions,
        pastSessions,
        availability,
        blockedDates,
        unreadCount,
        currentPage: 'appointments'
      });
    } catch (error) {
      console.error('Appointments page error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل صفحة إدارة المواعيد',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Update availability
  updateAvailability: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      const formData = req.body;
      
      // Process form data into workingHours object
      const workingHours = {
        monday: {
          enabled: formData.monday_available === '1',
          start: formData.monday_start || '09:00',
          end: formData.monday_end || '17:00',
          break_start: formData.monday_break_start || null,
          break_end: formData.monday_break_end || null
        },
        tuesday: {
          enabled: formData.tuesday_available === '1',
          start: formData.tuesday_start || '09:00',
          end: formData.tuesday_end || '17:00',
          break_start: formData.tuesday_break_start || null,
          break_end: formData.tuesday_break_end || null
        },
        wednesday: {
          enabled: formData.wednesday_available === '1',
          start: formData.wednesday_start || '09:00',
          end: formData.wednesday_end || '17:00',
          break_start: formData.wednesday_break_start || null,
          break_end: formData.wednesday_break_end || null
        },
        thursday: {
          enabled: formData.thursday_available === '1',
          start: formData.thursday_start || '09:00',
          end: formData.thursday_end || '17:00',
          break_start: formData.thursday_break_start || null,
          break_end: formData.thursday_break_end || null
        },
        friday: {
          enabled: formData.friday_available === '1',
          start: formData.friday_start || '09:00',
          end: formData.friday_end || '17:00',
          break_start: formData.friday_break_start || null,
          break_end: formData.friday_break_end || null
        },
        saturday: {
          enabled: formData.saturday_available === '1',
          start: formData.saturday_start || '09:00',
          end: formData.saturday_end || '17:00',
          break_start: formData.saturday_break_start || null,
          break_end: formData.saturday_break_end || null
        },
        sunday: {
          enabled: formData.sunday_available === '1',
          start: formData.sunday_start || '09:00',
          end: formData.sunday_end || '17:00',
          break_start: formData.sunday_break_start || null,
          break_end: formData.sunday_break_end || null
        },
        session_duration: parseInt(formData.session_duration || '60', 10),
        break_time: parseInt(formData.break_time || '15', 10)
      };
      
      // Update working hours
      await PsychologistAvailability.updateWorkingHours(psychologistId, workingHours);
      
      res.redirect('/psychologist/availability?success=تم تحديث ساعات العمل بنجاح');
    } catch (error) {
      console.error('Update availability error:', error);
      res.redirect('/psychologist/availability?error=حدث خطأ أثناء تحديث ساعات العمل');
    }
  },
  
  // Block date
  blockDate: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      const { date, reason } = req.body;
      
      // Check if there are any scheduled sessions on this date
      const sessions = await Session.getSessionsByDate(psychologistId, date);
      
      if (sessions.length > 0) {
        return res.redirect('/psychologist/availability?error=لا يمكن حظر تاريخ يحتوي على جلسات مجدولة');
      }
      
      // Block date
      await PsychologistAvailability.blockDate(psychologistId, date, reason);
      
      res.redirect('/psychologist/availability?success=تم حظر التاريخ بنجاح');
    } catch (error) {
      console.error('Block date error:', error);
      res.redirect('/psychologist/availability?error=حدث خطأ أثناء حظر التاريخ');
    }
  },
  
  // Unblock date
  unblockDate: async (req, res) => {
    try {
      const dateId = req.params.dateId;
      
      // Delete the blocked date
      await PsychologistAvailability.deleteBlockedDate(dateId);
      
      res.redirect('/psychologist/availability?success=تم إلغاء حظر التاريخ بنجاح');
    } catch (error) {
      console.error('Unblock date error:', error);
      res.redirect('/psychologist/availability?error=حدث خطأ أثناء إلغاء حظر التاريخ');
    }
  },
  
  // Get feedback page
  getFeedback: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      
      // Get feedback for the psychologist
      const feedback = await SessionFeedback.getByPsychologistId(psychologistId);
      
      // Calculate average ratings
      let totalRating = 0;
      let ratingCount = 0;
      
      feedback.forEach(item => {
        if (item.rating) {
          totalRating += item.rating;
          ratingCount++;
        }
      });
      
      const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;
      
      // Group ratings by score
      const ratingDistribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      };
      
      feedback.forEach(item => {
        if (item.rating) {
          ratingDistribution[item.rating]++;
        }
      });
      
      // Calculate stats for the feedback summary
      const stats = {
        totalCount: feedback.length,
        helpfulnessCounts: {
          extremely: feedback.filter(f => f.helpfulness === 'extremely').length,
          very: feedback.filter(f => f.helpfulness === 'very').length,
          somewhat: feedback.filter(f => f.helpfulness === 'somewhat').length,
          slightly: feedback.filter(f => f.helpfulness === 'slightly').length,
          not: feedback.filter(f => f.helpfulness === 'not').length
        },
        followUpCounts: {
          yes: feedback.filter(f => f.follow_up === 'yes').length,
          maybe: feedback.filter(f => f.follow_up === 'maybe').length,
          no: feedback.filter(f => f.follow_up === 'no').length
        }
      };
      
      res.render('pages/psychologist/feedback', { 
        title: 'Feedback | Raha',
        user: req.session.user,
        feedback,
        averageRating,
        ratingCount,
        ratingDistribution,
        stats
      });
    } catch (error) {
      console.error('Feedback error:', error);
      res.status(500).render('pages/error', { 
        message: 'An error occurred while loading feedback',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get profile page
  getProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      
      // Get user with complete profile information
      const user = await User.findById(userId);
      
      // Add detailed debug logging
      console.log('-------- DEBUG: USER OBJECT FOR EJS RENDERING --------');
      console.log('user.specialties:', user.specialties);
      console.log('Type of specialties:', typeof user.specialties);
      console.log('Is Array:', Array.isArray(user.specialties));
      console.log('Length:', user.specialties ? user.specialties.length : 'undefined');
      console.log('JSON stringify:', JSON.stringify(user.specialties));
      
      console.log('user.languages:', user.languages);
      console.log('Type of languages:', typeof user.languages);
      console.log('Is Array:', Array.isArray(user.languages));
      console.log('Length:', user.languages ? user.languages.length : 'undefined');
      console.log('JSON stringify:', JSON.stringify(user.languages));
      console.log('----------------------------------------------------');
      
      res.render('pages/psychologist/profile', { 
        title: 'الملف الشخصي | راحة',
        user: user,
        locale: 'ar',
        currentPage: 'profile'
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ أثناء تحميل الملف الشخصي',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Update profile
  updateProfile: async (req, res) => {
      // Debug full request body
      console.log('🔍 DEBUG - FULL REQUEST BODY:', JSON.stringify(req.body, null, 2));
      console.log('🔍 DEBUG - FORM DATA TYPE:', typeof req.body);
      
      // Examine the specialties and languages specifically
      console.log('🔍 DEBUG - SPECIALTIES RAW:', req.body.specialties);
      console.log('🔍 DEBUG - LANGUAGES RAW:', req.body.languages);
      console.log('🔍 DEBUG - SPECIALTIES TYPE:', typeof req.body.specialties);
      console.log('🔍 DEBUG - IS SPECIALTIES ARRAY:', Array.isArray(req.body.specialties));
    try {
      const userId = req.session.user.id;
      
      // Check if req.body exists
      if (!req.body) {
        console.error('req.body is undefined');
        return res.redirect('/psychologist/profile?error=حدث خطأ أثناء معالجة البيانات');
      }
      
      // Get form data with fallbacks to prevent undefined errors
      const name = req.body.name || '';
      // Handle specialties and languages arrays properly
      // When nothing is selected, the field may not be present in the request body at all
      const specialties = req.body.specialties || [];
      const languages = req.body.languages || [];
      const experience_years = req.body.experience_years || 0;
      const bio = req.body.bio || '';
      const current_password = req.body.current_password;
      const new_password = req.body.new_password;
      
      console.log('Raw specialties from form:', req.body.specialties);
      console.log('Raw languages from form:', req.body.languages);
      
      // Prepare user data
      // Log right before creating userData
      console.log('🔍 DEBUG - PREPARING USER DATA');
      console.log('🔍 DEBUG - SPECIALTIES BEFORE PROCESSING:', specialties);
      console.log('🔍 DEBUG - SPECIALTIES IS ARRAY:', Array.isArray(specialties));
      
      const userData = {
        name,
        // Ensure specialties and languages are handled as arrays and stored as JSON strings
        specialties: specialties ? (Array.isArray(specialties) ? specialties : [specialties]) : [],
        languages: languages ? (Array.isArray(languages) ? languages : [languages]) : [],
        experience_years: experience_years || 0,
        bio: bio || ''
      };
      
      // No need to convert arrays to JSON strings here as it's handled by User.stringifyProfileArrays
      
      console.log('Form data:', userData);
      
      // Handle password change if requested
      if (current_password && new_password) {
        // Verify current password
        const user = await User.findById(userId);
        const isPasswordValid = await User.verifyPassword(current_password, user.password);
        
        if (!isPasswordValid) {
          return res.redirect('/psychologist/profile?error=كلمة المرور الحالية غير صحيحة');
        }
        
        // Update password
        userData.password = await User.hashPassword(new_password);
      }
      
      // Handle avatar upload if provided
      if (req.files && req.files.avatar) {
        const avatar = req.files.avatar;
        const uploadDir = path.join(__dirname, '../public/uploads/avatars');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Generate unique filename
        const filename = `${userId}-${Date.now()}${path.extname(avatar.name)}`;
        const filepath = path.join(uploadDir, filename);
        
        // Save file
        await avatar.mv(filepath);
        
        // Update avatar path
        userData.avatar = `/uploads/avatars/${filename}`;
      }
      
      // Update user
      await User.update(userId, userData);
      
      // Update session user data
      req.session.user = await User.findById(userId);
      
      res.redirect('/psychologist/profile?success=تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      console.error('Update profile error:', error);
      res.redirect('/psychologist/profile?error=حدث خطأ أثناء تحديث الملف الشخصي');
    }
  },
  
  // Mark messages as read
  markMessagesAsRead: async (req, res) => {
    try {
      const psychologistId = req.session.user.id;
      const { senderId } = req.body;
      
      if (!senderId) {
        return res.status(400).json({
          success: false,
          message: 'يرجى توفير معرف المرسل'
        });
      }
      
      // Mark messages as read
      await SupportMessage.markConversationAsRead(parseInt(senderId), psychologistId);
      
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

module.exports = psychologistController;
