const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all dashboard routes
router.use(isAuthenticated);

// Dashboard home route
router.get('/', dashboardController.getDashboard);

// Profile route
router.get('/profile', dashboardController.getProfile);
router.post('/profile', dashboardController.updateProfile);

// Change password route
router.get('/change-password', dashboardController.getChangePassword);
router.post('/change-password', dashboardController.postChangePassword);

module.exports = router;
