const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all session routes
router.use(isAuthenticated);

// Sessions list route
router.get('/', sessionsController.getSessions);

// API routes for session booking
router.get('/api/psychologists/:id', sessionsController.getPsychologistDetails);
router.get('/api/sessions/available-slots', sessionsController.getAvailableTimeSlots);

// Book new session route
router.get('/book', sessionsController.getBookSession);
router.post('/book', sessionsController.postBookSession);

// View session details
router.get('/:id', sessionsController.getSessionDetails);

// Cancel session
router.post('/:id/cancel', sessionsController.cancelSession);

// Join session (WebRTC)
router.get('/:id/join', sessionsController.joinSession);

// Session feedback
router.get('/:id/feedback', sessionsController.getFeedbackForm);
router.post('/:id/feedback', sessionsController.submitFeedback);

module.exports = router;
