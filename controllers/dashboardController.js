const User = require('../models/User');
const StressSurvey = require('../models/StressSurvey');
const Recommendation = require('../models/Recommendation');
const path = require('path');
const fs = require('fs');

const dashboardController = {
  // Render dashboard
  getDashboard: async (req, res) => {
    try {
      const userId = req.session.user.id;
      
      // Get latest stress survey results
      const stressSurveys = await StressSurvey.getLatestByUserId(userId, 7); // Last 7 days
      
      // Get daily recommendation
      const recommendation = await Recommendation.getRandomRecommendation();
      
      // Calculate stress level and class
      let stressLevel = 0;
      let stressClass = 'bg-success';
      
      if (stressSurveys && stressSurveys.length > 0) {
        // Get the latest survey
        const latestSurvey = stressSurveys[stressSurveys.length - 1];
        
        // Calculate stress level (assuming the survey has a stress_level field)
        stressLevel = latestSurvey.stress_level || latestSurvey.average_stress || 0;
        
        // Determine stress class based on level
        if (stressLevel <= 30) {
          stressClass = 'bg-success';
        } else if (stressLevel <= 60) {
          stressClass = 'bg-warning';
        } else {
          stressClass = 'bg-error';
        }
      }
      
      res.render('pages/dashboard/index', { 
        title: 'لوحة التحكم | راحة',
        stressSurveys,
        recommendation,
        stressLevel,
        stressClass,
        user: req.session.user
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل لوحة التحكم',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Render profile page
  getProfile: (req, res) => {
    res.render('pages/dashboard/profile', { 
      title: 'u0627u0644u0645u0644u0641 u0627u0644u0634u062eu0635u064a | u0631u0627u062du0629',
      user: req.session.user,
      success: req.query.success === 'true',
      error: null
    });
  },
  
  // Update profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { first_name, last_name, phone, avatar_data } = req.body;
      
      // Validate input
      if (!first_name || !last_name) {
        return res.render('pages/dashboard/profile', { 
          title: 'الملف الشخصي | راحة',
          user: req.session.user,
          success: false,
          error: 'الاسم الأول والأخير مطلوبان'
        });
      }

      // Prepare update data
      const updateData = { first_name, last_name };
      
      // Add phone if provided
      if (phone) {
        updateData.phone = phone;
      }
      
      // Handle avatar upload if there's base64 data
      if (avatar_data && avatar_data.startsWith('data:image')) {
        try {
          // Extract the image format and base64 data
          const matches = avatar_data.match(/^data:image\/(\w+);base64,(.+)$/);
          
          if (!matches || matches.length !== 3) {
            throw new Error('Invalid image data format');
          }
          
          const imageFormat = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Create directory if it doesn't exist
          const avatarDir = path.join(__dirname, '../public/images/avatars');
          if (!fs.existsSync(avatarDir)) {
            fs.mkdirSync(avatarDir, { recursive: true });
          }
          
          // Save file
          const filename = `user_${userId}_${Date.now()}.${imageFormat}`;
          const filePath = path.join(avatarDir, filename);
          fs.writeFileSync(filePath, buffer);
          
          // Update avatar path in database
          updateData.avatar = `/images/avatars/${filename}`;
          
          console.log('Avatar saved successfully:', filename);
        } catch (avatarError) {
          console.error('Error saving avatar:', avatarError);
          // Continue with other updates even if avatar fails
        }
      }
      
      // Update user profile
      await User.update(userId, updateData);
      
      // Update session user data
      const updatedUser = await User.findById(userId);
      req.session.user = updatedUser;
      
      res.redirect('/dashboard/profile?success=true');
    } catch (error) {
      console.error('Profile update error:', error);
      res.render('pages/dashboard/profile', { 
        title: 'الملف الشخصي | راحة',
        user: req.session.user,
        success: false,
        error: 'حدث خطأ أثناء تحديث الملف الشخصي'
      });
    }
  },
  
  // Render change password page
  getChangePassword: (req, res) => {
    res.render('pages/dashboard/change-password', { 
      title: 'u062au063au064au064au0631 u0643u0644u0645u0629 u0627u0644u0645u0631u0648u0631 | u0631u0627u062du0629',
      user: req.session.user,
      success: req.query.success === 'true',
      error: null
    });
  },
  
  // Process change password
  postChangePassword: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { current_password, new_password, confirm_password } = req.body;
      
      // Validate input
      if (!current_password || !new_password || !confirm_password) {
        return res.render('pages/dashboard/change-password', { 
          title: 'u062au063au064au064au0631 u0643u0644u0645u0629 u0627u0644u0645u0631u0648u0631 | u0631u0627u062du0629',
          user: req.session.user,
          success: false,
          error: 'u062cu0645u064au0639 u0627u0644u062du0642u0648u0644 u0645u0637u0644u0648u0628u0629'
        });
      }
      
      if (new_password !== confirm_password) {
        return res.render('pages/dashboard/change-password', { 
          title: 'u062au063au064au064au0631 u0643u0644u0645u0629 u0627u0644u0645u0631u0648u0631 | u0631u0627u062du0629',
          user: req.session.user,
          success: false,
          error: 'u0643u0644u0645u0627u062a u0627u0644u0645u0631u0648u0631 u0627u0644u062cu062fu064au062fu0629 u063au064au0631 u0645u062au0637u0627u0628u0642u0629'
        });
      }
      
      // Change password
      await User.changePassword(userId, current_password, new_password);
      
      res.redirect('/dashboard/change-password?success=true');
    } catch (error) {
      console.error('Change password error:', error);
      res.render('pages/dashboard/change-password', { 
        title: 'u062au063au064au064au0631 u0643u0644u0645u0629 u0627u0644u0645u0631u0648u0631 | u0631u0627u062du0629',
        user: req.session.user,
        success: false,
        error: error.message || 'u062du062fu062b u062eu0637u0623 u0623u062bu0646u0627u0621 u062au063au064au064au0631 u0643u0644u0645u0629 u0627u0644u0645u0631u0648u0631'
      });
    }
  }
};

module.exports = dashboardController;
