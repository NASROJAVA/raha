const TrainingMaterial = require('../models/TrainingMaterial');

const trainingController = {
  // Get all training materials
  getTrainingMaterials: async (req, res) => {
    try {
      // Get all training materials
      const materials = await TrainingMaterial.getAll();
      
      res.render('pages/training/list', { 
        title: 'المواد التدريبية | راحة',
        user: req.session.user,
        materials,
        contentTypes: ['article', 'video', 'audio', 'document']
      });
    } catch (error) {
      console.error('Training materials error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل المواد التدريبية',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get specific training material using the direct database approach
  getTrainingMaterial: async function(req, res) {
    try {
      const materialId = req.params.id;
      
      // Direct database query approach
      const db = require('../config/db-wrapper');
      
      // Get material directly from the database using db.get instead of db.run for single item
      const material = await db.get('SELECT * FROM training_materials WHERE id = ?', [materialId]);
      
      // Handle case where material doesn't exist
      if (!material) {
        return res.status(404).render('pages/error', { 
          title: 'خطأ 404 | راحة',
          message: 'لم يتم العثور على المادة التدريبية',
          error: { status: 404, stack: '' },
          user: req.session.user || null
        });
      }
      
      console.log('Direct DB get material:', material);
      
      // Simply pass the raw material to the template - no processing needed
      const context = { 
        title: material.title + ' | راحة',
        user: req.session.user || null,
        material: material,
        path: req.path
      };
      
      // Use our beautiful main template
      return res.render('pages/training/view', context);
      
    } catch (error) {
      console.error('Training material view error:', error);
      return res.status(500).render('pages/error', { 
        title: 'خطأ 500 | راحة',
        message: 'حدث خطأ في تحميل المادة التدريبية',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' },
        user: req.session.user || null
      });
    }
  },
  
  // Search training materials
  searchTrainingMaterials: async (req, res) => {
    try {
      const { query } = req.query;
      
      // Validate query
      if (!query) {
        return res.redirect('/training');
      }
      
      // Search training materials
      const materials = await TrainingMaterial.search(query);
      
      res.render('pages/training/search', { 
        title: `نتائج البحث: ${query} | راحة`,
        user: req.session.user,
        materials,
        query,
        contentTypes: ['article', 'video', 'audio', 'document']
      });
    } catch (error) {
      console.error('Training materials search error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في البحث عن المواد التدريبية',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get training materials by content type
  getByContentType: async (req, res) => {
    try {
      const contentType = req.params.contentType;
      
      // Validate content type
      const validContentTypes = ['article', 'video', 'audio', 'document'];
      if (!validContentTypes.includes(contentType)) {
        return res.redirect('/training');
      }
      
      // Get training materials by content type
      const materials = await TrainingMaterial.getByContentType(contentType);
      
      // Map content type to Arabic
      const contentTypeMap = {
        'article': 'مقالات',
        'video': 'فيديوهات',
        'audio': 'صوتيات',
        'document': 'مستندات'
      };
      
      res.render('pages/training/type', { 
        title: `${contentTypeMap[contentType]} | راحة`,
        user: req.session.user,
        materials,
        contentType,
        contentTypeArabic: contentTypeMap[contentType],
        contentTypes: validContentTypes
      });
    } catch (error) {
      console.error('Training materials by type error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل المواد التدريبية',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Debug method to help diagnose issues with training material view
  debugTrainingMaterial: function(req, res) {
    const materialId = req.params.id;
    
    // Direct database query approach
    const db = require('../config/db-wrapper');
    
    db.run('SELECT * FROM training_materials WHERE id = ?', [materialId])
      .then(function(results) {
        const material = results && results.length > 0 ? results[0] : null;
        
        if (!material) {
          return res.status(404).send('Material not found');
        }
        
        // Render debug template with raw data
        return res.render('pages/training/debug', {
          materialId: materialId,
          material: material,
          session: { user: req.session.user || null }
        });
      })
      .catch(function(error) {
        console.error('Debug view error:', error);
        return res.status(500).send('Error: ' + error.message);
      });
  }
};

module.exports = trainingController;
