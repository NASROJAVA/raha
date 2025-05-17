const express = require('express');
const router = express.Router();
const psychologistController = require('../controllers/psychologistController');
const { isAuthenticated, isPsychologist } = require('../middleware/auth');

// Apply authentication middleware to all psychologist routes
router.use(isAuthenticated);
router.use(isPsychologist);

// Psychologist dashboard route
router.get('/dashboard', psychologistController.getDashboard);

// Stress statistics route
router.get('/statistics', psychologistController.getStatisticsPage);

// Messages routes
router.get('/messages', psychologistController.getMessages);
router.get('/messages/:id', psychologistController.getConversation);
router.post('/messages/send', psychologistController.sendMessage);
router.post('/messages/read', psychologistController.markMessagesAsRead);

// Sessions routes
router.get('/sessions', psychologistController.getSessions);
router.get('/sessions/view/:id', psychologistController.getSessionDetails);

// Redirect route for easier session URL access
router.get('/sessions/:id', (req, res) => {
    // Redirect to the view route with the same ID and preserve any query parameters
    const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString() 
        : '';
    res.redirect(`/psychologist/sessions/${queryString}`);
});
router.post('/sessions/update-status/:id', psychologistController.updateSessionStatus);
router.post('/sessions/update-notes/:id', psychologistController.updateSessionNotes);

// Availability routes
router.get('/availability', psychologistController.getAvailability);
router.post('/availability/update', psychologistController.updateAvailability);
router.post('/availability/block-date', psychologistController.blockDate);
router.get('/availability/unblock-date/:dateId', psychologistController.unblockDate);

// Appointments routes
router.get('/appointments', psychologistController.getAppointments);
router.post('/sessions/:id/confirm', psychologistController.updateSessionStatus);
router.post('/sessions/:id/cancel', psychologistController.updateSessionStatus);

// Feedback routes
router.get('/feedback', psychologistController.getFeedback);

// Profile routes
router.get('/profile', psychologistController.getProfile);
router.post('/profile', psychologistController.updateProfile);

module.exports = router;
