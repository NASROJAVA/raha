const User = require('../models/User');
const Session = require('../models/Session');
const SessionFeedback = require('../models/SessionFeedback');
const SessionMessage = require('../models/SessionMessage');
const socketManager = require('../config/socket');

// Helper function to get employee name
async function getEmployeeName(employeeId) {
  try {
    const employee = await User.findById(employeeId);
    return employee ? (employee.name || `${employee.first_name} ${employee.last_name}`) : 'غير معروف';
  } catch (error) {
    console.error('Error getting employee name:', error);
    return 'غير معروف';
  }
}

const sessionsController = {
  // Get all sessions for the user
  getSessions: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Use the dedicated methods that properly include psychologist/employee data
      const upcomingSessions = await Session.getUpcomingSessions(userId, userRole);
      const pastSessions = await Session.getPastSessions(userId, userRole);
      
      res.render('pages/sessions/index', { 
        title: 'جلساتي | راحة',
        user: req.session.user,
        upcomingSessions,
        pastSessions,
        locale: 'ar', // Default to Arabic locale
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Sessions list error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل قائمة الجلسات',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Render book session form
  getBookSession: async (req, res) => {
    try {
      // Only employees can book sessions
      if (req.session.user.role !== 'employee') {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بالوصول إلى هذه الصفحة',
          error: { status: 403, stack: '' }
        });
      }
      
      // Get all psychologists
      const psychologists = await User.getAllPsychologists();
      
      res.render('pages/sessions/book', { 
        title: 'حجز جلسة جديدة | راحة',
        user: req.session.user,
        psychologists,
        error: null
      });
    } catch (error) {
      console.error('Book session form error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل نموذج حجز الجلسة',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Process book session
  postBookSession: async (req, res) => {
    try {
      // Only employees can book sessions
      if (req.session.user.role !== 'employee') {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بالوصول إلى هذه الصفحة',
          error: { status: 403, stack: '' }
        });
      }
      
      const employeeId = req.session.user.id;
      const { psychologistId, date, timeSlot, type, title, description } = req.body;
      
      // Validate input
      if (!psychologistId || !date || !timeSlot || !type || !title) {
        // Get all psychologists for the form
        const psychologists = await User.getAllPsychologists();
        
        return res.render('pages/sessions/book', { 
          title: 'حجز جلسة جديدة | راحة',
          user: req.session.user,
          psychologists,
          error: 'يرجى ملء جميع الحقول المطلوبة'
        });
      }
      
      // Check if psychologist exists
      const psychologist = await User.findById(parseInt(psychologistId));
      if (!psychologist || psychologist.role !== 'psychologist') {
        // Get all psychologists for the form
        const psychologists = await User.getAllPsychologists();
        
        return res.render('pages/sessions/book', { 
          title: 'حجز جلسة جديدة | راحة',
          user: req.session.user,
          psychologists,
          error: 'المعالج النفسي غير صالح'
        });
      }
      
      console.log('Session booking data received:', {
        psychologistId,
        date,
        timeSlot,
        type,
        title,
        description,
        location: req.body.location || ''
      });
      
      // Parse the time slot to get start and end times
      let startTime, endTime;
      
      // Check if timeSlot contains a full time range (like "10:00 - 11:00")
      if (timeSlot.includes(' - ')) {
        [startTime, endTime] = timeSlot.split(' - ');
      } else {
        // If it's just an ID, we need to look up the associated times
        // In this case, we should have been passed additional hidden fields
        startTime = req.body.startTime || null;
        endTime = req.body.endTime || null;
        
        if (!startTime || !endTime) {
          console.error('Missing start or end times for session booking');
          return res.render('pages/sessions/book', { 
            title: 'حجز جلسة جديدة | راحة',
            user: req.session.user,
            psychologists: await User.getAllPsychologists(),
            error: 'حدث خطأ في تحديد وقت الجلسة. يرجى المحاولة مرة أخرى.'
          });
        }
      }
      
      // Format times properly to ensure they're in HH:MM format
      const formatTime = (timeStr) => {
        if (!timeStr) return null;
        // If it's just a number, assume it's hours and add :00
        if (/^\d{1,2}$/.test(timeStr)) {
          return timeStr.padStart(2, '0') + ':00';
        }
        // If it already has a colon, ensure proper format
        if (timeStr.includes(':')) {
          const [hours, minutes] = timeStr.split(':');
          return hours.padStart(2, '0') + ':' + (minutes || '00');
        }
        return timeStr;
      };
      
      const formattedStartTime = formatTime(startTime);
      const formattedEndTime = formatTime(endTime);
      
      console.log(`Formatted times: ${formattedStartTime} - ${formattedEndTime}`);
      
      // Check if the psychologist is available at the requested time
      const isAvailable = await Session.checkPsychologistAvailability(
        parseInt(psychologistId),
        date,
        formattedStartTime,
        formattedEndTime
      );
      
      console.log(`Psychologist ${psychologistId} availability for ${date} at ${startTime}-${endTime}: ${isAvailable ? 'Available' : 'Not available'}`);
      
      if (!isAvailable) {
        return res.render('pages/sessions/book', { 
          title: 'حجز جلسة جديدة | راحة',
          user: req.session.user,
          psychologists: await User.getAllPsychologists(),
          error: 'المعالج النفسي غير متاح في الوقت المطلوب'
        });
      }
      
      // Check for overlapping sessions for both the employee and the psychologist
      const employeeHasOverlap = await Session.checkSessionOverlap(
        employeeId,
        'employee',
        date,
        formattedStartTime,
        formattedEndTime
      );
      
      if (employeeHasOverlap) {
        return res.render('pages/sessions/book', { 
          title: 'حجز جلسة جديدة | راحة',
          user: req.session.user,
          psychologists: await User.getAllPsychologists(),
          error: 'لديك جلسة أخرى محجوزة في نفس الوقت. يرجى اختيار وقت آخر.'
        });
      }
      
      const psychologistHasOverlap = await Session.checkSessionOverlap(
        parseInt(psychologistId),
        'psychologist',
        date,
        formattedStartTime,
        formattedEndTime
      );
      
      if (psychologistHasOverlap) {
        return res.render('pages/sessions/book', { 
          title: 'حجز جلسة جديدة | راحة',
          user: req.session.user,
          psychologists: await User.getAllPsychologists(),
          error: 'المعالج النفسي لديه جلسة أخرى محجوزة في نفس الوقت. يرجى اختيار وقت آخر.'
        });
      }
      
      // Create session with all required fields from the form
      const sessionData = {
        employee_id: employeeId,
        psychologist_id: parseInt(psychologistId),
        title,
        description,
        session_date: date,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        type,
        location: req.body.location || ''
      };
      
      try {
        console.log('Attempting to create session with data:', sessionData);
        await Session.create(sessionData);
        console.log('Session created successfully');
      } catch (error) {
        console.error('Error creating session:', error);
        throw error;
      }
      
      // Redirect to sessions list with success message
      res.redirect('/sessions?success=تم حجز الجلسة بنجاح');
    } catch (error) {
      console.error('Book session error:', error);
      res.redirect('/sessions?error=حدث خطأ أثناء حجز الجلسة');
    }
  },
  
  // Get session details
  getSessionDetails: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the user
      if (!session || (userRole === 'employee' && session.employee_id !== userId) || 
          (userRole === 'psychologist' && session.psychologist_id !== userId)) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404, stack: '' }
        });
      }
      
      res.render('pages/sessions/details', { 
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
  
  // Cancel session
  cancelSession: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the user
      if (!session || (userRole === 'employee' && session.employee_id !== userId) || 
          (userRole === 'psychologist' && session.psychologist_id !== userId)) {
        return res.redirect('/sessions?error=لم يتم العثور على الجلسة');
      }
      
      // Check if session is already completed or cancelled
      if (session.status !== 'scheduled')  if (userRole === 'employee'){
        return res.redirect(`/sessions/view/${sessionId}?error=${encodeURIComponent('لا يمكن إلغاء الجلسة')}`);
      }else return res.redirect(`/psychologist/sessions/${sessionId}?error=${encodeURIComponent('لا يمكن إلغاء الجلسة')}`);
      
      // Cancel the session
      await Session.updateStatus(sessionId, 'cancelled');
      
      // Redirect to session details with success message
      res.redirect(`/sessions/view/${sessionId}?success=u062au0645 u0625u0644u063au0627u0621 u0627u0644u062cu0644u0633u0629 u0628u0646u062cu0627u062d`);
    } catch (error) {
      console.error('Cancel session error:', error);
      res.redirect('/sessions?error=u062du062fu062b u062eu0637u0623 u0623u062bu0646u0627u0621 u0625u0644u063au0627u0621 u0627u0644u062cu0644u0633u0629');
    }
  },
  
  // Join session (WebRTC)
  joinSession: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists
      if (!session) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404, stack: '' }
        });
      }
      
      // Check if the user is authorized to join this session
      if ((userRole === 'employee' && session.employee_id !== userId) || 
          (userRole === 'psychologist' && session.psychologist_id !== userId)) {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بالوصول إلى هذه الجلسة',
          error: { status: 403, stack: '' }
        });
      }
      
      // Check if session is of type video
      if (session.type !== 'video') {
        return res.status(400).render('pages/error', { 
          message: 'لا يمكن الانضمام إلى جلسة غير مرئية',
          error: { status: 400, stack: '' }
        });
      }
      
      // Automatically update session status when a participant joins
      await Session.updateSessionStatus(sessionId, {
        participantJoined: true,
        isEmployee: userRole === 'employee',
        isPsychologist: userRole === 'psychologist'
      });
      
      // Get the updated session
      const updatedSession = await Session.findById(sessionId);
      
      // Get the other participant's information
      let otherParticipant;
      if (userRole === 'employee') {
        otherParticipant = await User.findById(updatedSession.psychologist_id);
      } else {
        otherParticipant = await User.findById(updatedSession.employee_id);
      }
      
      // Parse session date and times
      const sessionDateStr = updatedSession.session_date || updatedSession.date;
      
      // Normalize time format to ensure it has seconds (HH:MM:SS)
      let startTimeStr = updatedSession.start_time;
      // Ensure startTimeStr is a string before using string methods
      if (typeof startTimeStr === 'string') {
        if (startTimeStr.split(':').length < 3) {
          startTimeStr = startTimeStr + (startTimeStr.split(':').length < 2 ? ':00:00' : ':00');
        }
      } else if (startTimeStr) {
        // If startTimeStr exists but is not a string, convert it to string
        startTimeStr = String(startTimeStr);
      } else {
        // Provide a default value if startTimeStr is null or undefined
        startTimeStr = '00:00:00';
        console.log('Warning: updatedSession.start_time was null or undefined');
      }
      
      let endTimeStr = updatedSession.end_time;
      // Ensure endTimeStr is a string before using string methods
      if (typeof endTimeStr === 'string') {
        if (endTimeStr.split(':').length < 3) {
          endTimeStr = endTimeStr + (endTimeStr.split(':').length < 2 ? ':00:00' : ':00');
        }
      } else if (endTimeStr) {
        // If endTimeStr exists but is not a string, convert it to string
        endTimeStr = String(endTimeStr);
      } else {
        // Provide a default value if endTimeStr is null or undefined
        endTimeStr = '00:00:00';
        console.log('Warning: updatedSession.end_time was null or undefined');
      }
      
      // Ensure we have proper date and time format for parsing
      // Declare variables outside the try block to ensure they're in scope for the entire function
      let timeDiffStart = 60; // Default to 60 minutes
      let timeDiffEnd = 120; // Default to 120 minutes
      let sessionDate, sessionEndTime;
      
      // Get current time using system's local time
      const now = new Date();
      
      console.log(`Current time (system's local time): ${now.toISOString()}`);
      console.log(`Using system's local time for all date/time operations`);
      
      const isValidDate = date => !isNaN(date.getTime());
      
      try {
        console.log('Session date and time data:', {
          sessionDateStr,
          startTimeStr,
          endTimeStr,
          full_start: `${sessionDateStr}T${startTimeStr}`,
          full_end: `${sessionDateStr}T${endTimeStr}`
        });
        
        // Helper function to create dates using system's local time
        const createLocalDate = (dateStr, timeStr) => {
          if (!dateStr || !timeStr) return null;
          
          console.log(`Creating date from: ${dateStr} ${timeStr} using system's local time`);
          
          try {
            // Parse date components
            let year, month, day;
            if (dateStr.includes('-') || dateStr.includes('/')) {
              // Handle YYYY-MM-DD or YYYY/MM/DD format
              const dateParts = dateStr.split(/[-\/]/);
              if (dateParts.length === 3) {
                year = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
                day = parseInt(dateParts[2]);
              } else {
                console.error(`Invalid date format: ${dateStr}`);
                return null;
              }
            } else {
              // Unable to parse date
              console.error(`Unable to parse date: ${dateStr}`);
              return null;
            }
            
            // Parse time components
            let hours = 0, minutes = 0, seconds = 0;
            if (timeStr) {
              const timeParts = timeStr.split(':');
              hours = parseInt(timeParts[0] || 0);
              minutes = parseInt(timeParts[1] || 0);
              seconds = parseInt(timeParts[2] || 0);
            }
            
            // Create date using system's local time
            const date = new Date(year, month, day, hours, minutes, seconds);
            
            if (!isValidDate(date)) {
              console.error(`Created invalid date from components: ${year}-${month+1}-${day} ${hours}:${minutes}:${seconds}`);
              return null;
            }
            
            console.log(`Created date: ${date.toISOString()} from ${dateStr} ${timeStr} using system's local time`);
            return date;
          } catch (e) {
            console.error(`Error creating date from ${dateStr} ${timeStr}:`, e);
            return null;
          }
        };
        
        // Try to create session date objects
        sessionDate = createLocalDate(sessionDateStr, startTimeStr);
        sessionEndTime = createLocalDate(sessionDateStr, endTimeStr);
        
        // Handle invalid session start date
        if (!sessionDate || !isValidDate(sessionDate)) {
          console.warn(`Invalid session start date: ${sessionDateStr} ${startTimeStr}`);
          
          // Try to use current date with the time component
          try {
            const currentDate = new Date();
            const fallbackDateStr = [
              currentDate.getFullYear(),
              String(currentDate.getMonth() + 1).padStart(2, '0'),
              String(currentDate.getDate()).padStart(2, '0')
            ].join('-');
            
            sessionDate = createLocalDate(fallbackDateStr, startTimeStr);
            console.warn(`Using today's date (${fallbackDateStr}) with original time: ${sessionDate?.toISOString() || 'still invalid'}`);
            
            // If still invalid, create a simple date directly
            if (!sessionDate || !isValidDate(sessionDate)) {
              sessionDate = new Date(); // Current time as fallback
              console.warn('Using current time as fallback: ' + sessionDate.toISOString());
            }
          } catch (e) {
            console.error('Error creating fallback session date:', e);
            sessionDate = new Date(); // Final fallback
          }
        }
        
        // Handle invalid session end date
        if (!sessionEndTime || !isValidDate(sessionEndTime)) {
          console.warn(`Invalid session end date: ${sessionDateStr} ${endTimeStr}`);
          
          // Use session start date + 1 hour if available
          if (sessionDate && isValidDate(sessionDate)) {
            sessionEndTime = new Date(sessionDate.getTime());
            sessionEndTime.setHours(sessionEndTime.getHours() + 1);
            console.warn('Using session start time + 1 hour as end time: ' + sessionEndTime.toISOString());
          } else {
            // Fallback to current time + 1 hour
            sessionEndTime = new Date();
            sessionEndTime.setHours(sessionEndTime.getHours() + 1);
            console.warn('Using current time + 1 hour as fallback end time: ' + sessionEndTime.toISOString());
          }
        }
        
        // Calculate time differences in minutes
        // Here we're comparing local time to local time which avoids timezone issues
        if (isValidDate(sessionDate)) {
          timeDiffStart = Math.round((sessionDate.getTime() - now.getTime()) / (60 * 1000));
        }
        
        if (isValidDate(sessionEndTime)) {
          timeDiffEnd = Math.round((sessionEndTime.getTime() - now.getTime()) / (60 * 1000));
        }
        
        console.log(`Session ${sessionId} date objects:`, {
          sessionDate: isValidDate(sessionDate) ? sessionDate.toISOString() : 'Invalid Date',
          sessionEndTime: isValidDate(sessionEndTime) ? sessionEndTime.toISOString() : 'Invalid Date',
          now: now.toISOString(),
          isSessionDateValid: isValidDate(sessionDate),
          isSessionEndTimeValid: isValidDate(sessionEndTime)
        });
      } catch (error) {
        console.error('Error parsing session dates:', error);
        // Set default values if date parsing fails completely
        sessionDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        sessionEndTime = new Date(now.getTime() + 120 * 60 * 1000); // 2 hours from now
        // Default values already set at top of block
      }
      
      console.log(`Session ${sessionId} time differences: Start=${timeDiffStart}min, End=${timeDiffEnd}min`);
      
      // Check if we're within the valid time window for the session
      if (timeDiffStart > 5) {
        // Session hasn't started yet, show waiting room
        return res.render('pages/sessions/waiting', {
          title: 'انتظار بدء الجلسة | راحة',
          user: req.session.user,
          session: {
            ...session,
            psychologist_name: otherParticipant.name || `${otherParticipant.first_name} ${otherParticipant.last_name}`,
            employee_name: userRole === 'psychologist' ? await getEmployeeName(session.employee_id) : undefined
          },
          minutesToStart: timeDiffStart,
          locale: 'ar' // Default to Arabic locale
        });
      } else if (timeDiffEnd < 0) {
        // Session has ended
        return res.redirect(`/sessions/${sessionId}?error=انتهت الجلسة`);
      } else {
        // Session is active or about to be active
        if (session.status === 'scheduled') {
          await Session.updateStatus(sessionId, 'active');
          session.status = 'active';
          console.log(`Session ${sessionId} has been activated automatically`);
        }
        
        // Get session messages with error handling
        let messages = [];
        try {
          messages = await SessionMessage.getBySessionId(sessionId);
        } catch (messageError) {
          console.error('Error retrieving session messages:', messageError);
          // Continue without messages if there's an error (like missing table)
          // This prevents the entire session from failing if messages can't be loaded
        }
        
        // Render video session page
        res.render('pages/sessions/video', { 
          title: 'جلسة عبر الإنترنت | راحة',
          user: req.session.user,
          session: {
            ...session,
            startTime: session.start_time,
            endTime: session.end_time
          },
          otherParticipant: {
            ...otherParticipant,
            name: otherParticipant.name || `${otherParticipant.first_name} ${otherParticipant.last_name}`
          },
          messages,
          locale: 'ar' // Default to Arabic locale
        });
      }
    } catch (error) {
      console.error('Join session error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في الانضمام إلى الجلسة',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },

  // Get feedback form
  getFeedbackForm: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;
      
      // Only employees can leave feedback
      if (req.session.user.role !== 'employee') {
        return res.redirect('/sessions');
      }
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the user
      if (!session || session.employee_id !== userId) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404, stack: '' }
        });
      }
      
      // Check if session is completed
      if (session.status !== 'completed') {
        return res.redirect(`/sessions/${sessionId}?error=لا يمكن ترك تقييم للجلسة قبل اكتمالها`);
      }
      
      // Check if feedback already exists
      const existingFeedback = await SessionFeedback.getBySessionId(sessionId);
      if (existingFeedback) {
        return res.redirect(`/sessions/${sessionId}?error=تم تقديم التقييم بالفعل لهذه الجلسة`);
      }
      
      res.render('pages/sessions/feedback', { 
        title: 'تقييم الجلسة | راحة',
        user: req.session.user,
        session,
        locale: res.locals.currentLocale || 'ar'
      });
    } catch (error) {
      console.error('Feedback form error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل نموذج التقييم',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },

  // Submit feedback
  submitFeedback: async (req, res) => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;
      
      // Only employees can leave feedback
      if (req.session.user.role !== 'employee') {
        return res.redirect('/sessions');
      }
      
      // Get the session
      const session = await Session.findById(sessionId);
      
      // Check if session exists and belongs to the user
      if (!session || session.employee_id !== userId) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الجلسة',
          error: { status: 404, stack: '' }
        });
      }
      
      // Check if session is completed
      if (session.status !== 'completed') {
        return res.redirect(`/sessions/${sessionId}?error=لا يمكن ترك تقييم للجلسة قبل اكتمالها`);
      }
      
      // Check if feedback already exists
      const existingFeedback = await SessionFeedback.getBySessionId(sessionId);
      if (existingFeedback) {
        return res.redirect(`/sessions/${sessionId}?error=تم تقديم التقييم بالفعل لهذه الجلسة`);
      }
      
      // Get feedback data from request
      const { rating, helpfulness, improvements, comments, followUp } = req.body;
      
      // Validate input
      if (!rating || !helpfulness || !followUp) {
        return res.render('pages/sessions/feedback', { 
          title: 'تقييم الجلسة | راحة',
          user: req.session.user,
          session,
          error: 'يرجى ملء جميع الحقول المطلوبة',
          locale: req.getLocale() || 'ar'
        });
      }
      
      // Create feedback
      await SessionFeedback.create({
        session_id: sessionId,
        rating: parseInt(rating),
        helpfulness,
        improvements: improvements ? (Array.isArray(improvements) ? improvements : [improvements]) : [],
        comments: comments || '',
        follow_up: followUp
      });
      
      // Redirect to session details with success message
      res.redirect(`/sessions/${sessionId}?success=تم تقديم التقييم بنجاح`);
    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تقديم التقييم',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },

  // Get psychologist details for API
  getPsychologistDetails: async (req, res) => {
    try {
      const psychologistId = req.params.id;
      
      // Get psychologist details
      const psychologist = await User.findById(psychologistId);
      
      if (!psychologist || psychologist.role !== 'psychologist') {
        return res.status(404).json({ error: 'Psychologist not found' });
      }
      
      // Return psychologist details
      res.json({
        id: psychologist.id,
        name: psychologist.name,
        avatar: psychologist.avatar,
        bio: psychologist.bio,
        specialties: psychologist.specialties || [],
        languages: psychologist.languages || []
      });
    } catch (error) {
      console.error('Get psychologist details error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Get available time slots for a psychologist on a specific date
  getAvailableTimeSlots: async (req, res) => {
    try {
      const { psychologistId, date } = req.query;
      
      if (!psychologistId || !date) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Get available time slots
      const slots = await Session.getAvailableTimeSlots(psychologistId, date);
      
      res.json({ slots });
    } catch (error) {
      console.error('Get available time slots error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = sessionsController;
