const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');
const { isAuthenticated } = require('../middleware/auth');
const { enableAsyncTemplates } = require('../middleware/viewMiddleware');

// Apply authentication middleware to all training routes
router.use(isAuthenticated);

// Training materials list route
router.get('/', trainingController.getTrainingMaterials);

// View specific training material - no middleware
router.get('/view/:id', trainingController.getTrainingMaterial);

// Debug route to see raw data
router.get('/debug/:id', trainingController.debugTrainingMaterial);

// Alternative direct ID access route (for backward compatibility) - no middleware
router.get('/:id', trainingController.getTrainingMaterial);

// Search training materials
router.get('/search', trainingController.searchTrainingMaterials);

// Filter by content type
router.get('/type/:contentType', trainingController.getByContentType);

module.exports = router;
