const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all survey routes
router.use(isAuthenticated);

// Survey form route
router.get('/', surveyController.getSurveyForm);

// Submit survey route
router.post('/submit', surveyController.submitSurvey);

// View survey history
router.get('/history', surveyController.getSurveyHistory);

// View specific survey result
router.get('/result/:id', surveyController.getSurveyResult);

module.exports = router;
