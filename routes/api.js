const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all API routes
router.use(isAuthenticated);

// Get user details by ID
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user details
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Return user details
    res.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user details' 
    });
  }
});

module.exports = router;
