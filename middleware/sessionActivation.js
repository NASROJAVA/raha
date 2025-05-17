// Session Activation Middleware
const Session = require('../models/Session');

const activateSession = async (req, res, next) => {
  const sessionId = req.params.id;
  
  try {
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).render('pages/error', {
        message: 'لم يتم العثور على الجلسة',
        error: { status: 404 }
      });
    }
    
    // Ensure the current user is authorized to access this session
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    if ((userRole === 'psychologist' && session.psychologist_id !== userId) || 
        (userRole === 'employee' && session.employee_id !== userId)) {
      return res.status(403).render('pages/error', {
        message: 'غير مصرح لك بالوصول إلى هذه الجلسة',
        error: { status: 403 }
      });
    }
    
    // Get the current time using system's local time
    const now = new Date();
    
    // Format the date correctly for comparison
    const sessionDateStr = session.date || session.session_date;
    
    // Parse session start time
    const sessionStartDate = new Date(sessionDateStr);
    sessionStartDate.setHours(
      parseInt(session.start_time.split(':')[0]),
      parseInt(session.start_time.split(':')[1]),
      0, 0
    );
    
    // Parse session end time
    const sessionEndDate = new Date(sessionDateStr);
    sessionEndDate.setHours(
      parseInt(session.end_time.split(':')[0]),
      parseInt(session.end_time.split(':')[1]),
      0, 0
    );
    
    // Log time values for debugging
    console.log('Session date:', sessionDateStr);
    console.log('Session start time:', session.start_time);
    console.log('Session end time:', session.end_time);
    console.log('Parsed session start:', sessionStartDate.toISOString());
    console.log('Parsed session end:', sessionEndDate.toISOString());
    console.log('Current time (Local):', now.toISOString());
    
    // Calculate time differences
    const timeDiffStart = (sessionStartDate.getTime() - now.getTime()) / (60 * 1000); // in minutes
    const timeDiffEnd = (sessionEndDate.getTime() - now.getTime()) / (60 * 1000); // in minutes
    
    // Add debugging for time differences
    console.log('Time diff start (minutes):', timeDiffStart);
    console.log('Time diff end (minutes):', timeDiffEnd);
    
    // Check if session is within the time window (5 minutes before start until end time)
    if (timeDiffStart <= 5 && timeDiffEnd >= 0) {
      // Session is active or about to be active
      console.log(`Session ${sessionId} is active or about to be active`);
      if (session.status === 'scheduled') {
        await Session.updateStatus(sessionId, 'active');
        session.status = 'active';
        console.log(`Session ${sessionId} has been activated automatically`);
      }
      
      req.activeSession = session;
      next();
    } else if (timeDiffStart > 5) {
      // Session has not started yet
      console.log(`Session ${sessionId} has not started yet, ${Math.round(timeDiffStart)} minutes remaining`);
      return res.render('pages/sessions/waiting', {
        title: 'انتظار بدء الجلسة | راحة',
        user: req.session.user,
        session: session,
        minutesToStart: Math.round(timeDiffStart)
      });
    } else if (timeDiffEnd < 0) {
      // Session has ended
      console.log(`Session ${sessionId} has ended, ${Math.round(Math.abs(timeDiffEnd))} minutes ago`);
      if (session.status === 'active') {
        await Session.updateStatus(sessionId, 'completed');
        session.status = 'completed';
        console.log(`Session ${sessionId} has been marked as completed automatically`);
      }
      
      return res.redirect(`/sessions/view/${sessionId}?message=انتهت الجلسة`);
    }
  } catch (error) {
    console.error('Session activation error:', error);
    return res.status(500).render('pages/error', {
      message: 'حدث خطأ في التحقق من حالة الجلسة',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
};

module.exports = { activateSession };
