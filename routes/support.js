const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all support routes
router.use(isAuthenticated);

// Support inbox route
router.get('/', supportController.getInbox);

// View conversation with a psychologist
router.get('/conversation/:psychologistId', supportController.getConversation);

// Send message route
router.post('/send', supportController.sendMessage);

// Mark messages as read
router.post('/messages/read', supportController.markMessagesAsRead);

// Get all psychologists
router.get('/psychologists', supportController.getPsychologists);

module.exports = router;
