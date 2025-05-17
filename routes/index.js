const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');
const contactController = require('../controllers/contactController');

// Home page route
router.get('/', indexController.getHomePage);

// About page route
router.get('/about', indexController.getAboutPage);

// Contact page routes
router.get('/contact', contactController.getContactPage);
router.post('/contact/submit', contactController.submitContactForm);

module.exports = router;
