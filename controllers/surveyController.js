const StressSurvey = require('../models/StressSurvey');

const surveyController = {
  // Render survey form
  getSurveyForm: (req, res) => {
    res.render('pages/survey/form', { 
      title: 'استبيان الضغط اليومي | راحة',
      user: req.session.user,
      error: null
    });
  },
  
  // Submit survey
  submitSurvey: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const formData = req.body;
      
      // Process the answers from form data
      const answers = [];
      // We expect 10 questions (0-9)
      for (let i = 0; i < 10; i++) {
        const answer = formData[`answer${i}`];
        if (!answer) {
          return res.render('pages/survey/form', { 
            title: 'استبيان الضغط اليومي | راحة',
            user: req.session.user,
            error: 'يرجى الإجابة على جميع الأسئلة'
          });
        }
        answers.push(parseInt(answer));
      }
      
      // Calculate stress level as a percentage out of 100%
      // Each question is on a 1-5 scale, so:
      // - Minimum possible total = 10 (all answers are 1)
      // - Maximum possible total = 50 (all answers are 5)
      const total = answers.reduce((sum, value) => sum + value, 0);
      
      // Convert to percentage:
      // ((total - min) / (max - min)) * 100
      // ((total - 10) / (50 - 10)) * 100
      const stressLevel = Math.round(((total - 10) / 40) * 100);
      
      // Ensure the stress level stays within 0-100 range
      const finalStressLevel = Math.min(100, Math.max(0, stressLevel));
      
      // Create survey data
      const surveyData = {
        user_id: userId,
        stress_level: finalStressLevel,
        survey_data: { answers }
      };
      
      // Save survey to database
      const survey = await StressSurvey.create(surveyData);
      
      // Redirect to result page
      res.redirect(`/survey/result/${survey.id}`);
    } catch (error) {
      console.error('Survey submission error:', error);
      res.render('pages/survey/form', { 
        title: 'استبيان الضغط اليومي | راحة',
        user: req.session.user,
        error: 'حدث خطأ أثناء تقديم الاستبيان. يرجى المحاولة مرة أخرى.'
      });
    }
  },
  
  // Get survey history
  getSurveyHistory: async (req, res) => {
    try {
      const userId = req.session.user.id;
      
      // Get all surveys for the user
      const surveys = await StressSurvey.getLatestByUserId(userId, 30); // Last 30 surveys
      
      // Get stress trends
      const stressTrends = await StressSurvey.getStressTrends(userId, 30); // Last 30 days
      
      res.render('pages/survey/history', { 
        title: 'سجل الاستبيانات | راحة',
        user: req.session.user,
        surveys,
        stressTrends
      });
    } catch (error) {
      console.error('Survey history error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل سجل الاستبيانات',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get specific survey result
  getSurveyResult: async (req, res) => {
    try {
      const surveyId = req.params.id;
      const userId = req.session.user.id;
      
      // Get the survey
      const survey = await StressSurvey.findById(surveyId);
      
      // Check if survey exists and belongs to the user
      if (!survey || survey.user_id !== userId) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على الاستبيان',
          error: { status: 404, stack: '' }
        });
      }
      
      // Get recommendations based on stress level
      let recommendationType = 'normal';
      if (survey.stress_level > 70) {
        recommendationType = 'high';
      } else if (survey.stress_level > 40) {
        recommendationType = 'medium';
      }
      
      res.render('pages/survey/result', { 
        title: 'نتيجة الاستبيان | راحة',
        user: req.session.user,
        survey,
        recommendationType
      });
    } catch (error) {
      console.error('Survey result error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل نتيجة الاستبيان',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  }
};

module.exports = surveyController;
