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
  },
  
  // Get specific video material for enhanced video player
  getVideoMaterial: async function(req, res) {
    try {
      const videoId = req.params.id;
      
      // Direct database query approach
      const db = require('../config/db-wrapper');
      
      // Get the requested video
      const material = await db.get('SELECT * FROM training_materials WHERE id = ? AND content_type = "video"', [videoId]);
      
      // Debug logging for video information
      console.log('Video ID:', videoId);
      console.log('Video material found:', material ? 'Yes' : 'No');
      if (material) {
        console.log('Video URL:', material.video_url);
        console.log('Video title:', material.title);
      }
      
      // Handle case where video doesn't exist
      if (!material) {
        return res.status(404).render('pages/error', { 
          title: 'خطأ 404 | راحة',
          message: 'لم يتم العثور على الفيديو',
          error: { status: 404, stack: '' },
          user: req.session.user || null
        });
      }
      
      // Get related videos (same category or tags)
      let relatedVideos = [];
      if (material.category_id) {
        relatedVideos = await db.run(
          'SELECT * FROM training_materials WHERE content_type = "video" AND id != ? AND category_id = ? LIMIT 5', 
          [videoId, material.category_id]
        );
      } else {
        // If no category, just get other recent videos
        relatedVideos = await db.run(
          'SELECT * FROM training_materials WHERE content_type = "video" AND id != ? LIMIT 5',
          [videoId]
        );
      }
      
      const context = { 
        title: material.title + ' | راحة',
        user: req.session.user || null,
        material: material,
        related: relatedVideos,
        path: req.path
      };
      
      // Render the video view template
      return res.render('pages/training/viewvideo', context);
      
    } catch (error) {
      console.error('Video material view error:', error);
      return res.status(500).render('pages/error', { 
        title: 'خطأ 500 | راحة',
        message: 'حدث خطأ في تحميل الفيديو',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' },
        user: req.session.user || null
      });
    }
  },
  
  // Get specific document material for PDF viewer
  getDocumentMaterial: async function(req, res) {
    try {
      const documentId = req.params.id;
      
      // Direct database query approach
      const db = require('../config/db-wrapper');
      
      // Get the requested document
      const material = await db.get('SELECT * FROM training_materials WHERE id = ? AND (content_type = "document" OR content_type = "article")', [documentId]);
      
      // Handle case where document doesn't exist
      if (!material) {
        return res.status(404).render('pages/error', { 
          title: 'خطأ 404 | راحة',
          message: 'لم يتم العثور على المستند',
          error: { status: 404, stack: '' },
          user: req.session.user || null
        });
      }
      
      // Get related documents (same category or tags)
      let relatedDocuments = [];
      if (material.category_id) {
        relatedDocuments = await db.run(
          'SELECT * FROM training_materials WHERE (content_type = "document" OR content_type = "article") AND id != ? AND category_id = ? LIMIT 5', 
          [documentId, material.category_id]
        );
      } else {
        // If no category, just get other recent documents
        relatedDocuments = await db.run(
          'SELECT * FROM training_materials WHERE (content_type = "document" OR content_type = "article") AND id != ? LIMIT 5',
          [documentId]
        );
      }
      
      const context = { 
        title: material.title + ' | راحة',
        user: req.session.user || null,
        material: material,
        related: relatedDocuments,
        path: req.path
      };
      
      // Render the document view template
      return res.render('pages/training/viewdocument', context);
      
    } catch (error) {
      console.error('Document material view error:', error);
      return res.status(500).render('pages/error', { 
        title: 'خطأ 500 | راحة',
        message: 'حدث خطأ في تحميل المستند',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' },
        user: req.session.user || null
      });
    }
  },
  
  // Get specific audio material for enhanced audio player
  getAudioMaterial: async function(req, res) {
    try {
      const audioId = req.params.id;
      
      // Direct database query approach
      const db = require('../config/db-wrapper');
      
      // Get the requested audio
      const material = await db.get('SELECT * FROM training_materials WHERE id = ? AND content_type = "audio"', [audioId]);
      
      // Debug logging for audio information
      console.log('Audio ID:', audioId);
      console.log('Audio material found:', material ? 'Yes' : 'No');
      if (material) {
        console.log('Audio file URL:', material.file_url);
        console.log('Audio title:', material.title);
      }
      
      // Handle case where audio doesn't exist
      if (!material) {
        return res.status(404).render('pages/error', { 
          title: 'خطأ 404 | راحة',
          message: 'لم يتم العثور على الملف الصوتي',
          error: { status: 404, stack: '' },
          user: req.session.user || null
        });
      }
      
      // Get related audio materials (same category or tags)
      let relatedAudio = [];
      if (material.category_id) {
        relatedAudio = await db.run(
          'SELECT * FROM training_materials WHERE content_type = "audio" AND id != ? AND category_id = ? LIMIT 5', 
          [audioId, material.category_id]
        );
      } else {
        // If no category, just get other recent audio files
        relatedAudio = await db.run(
          'SELECT * FROM training_materials WHERE content_type = "audio" AND id != ? LIMIT 5',
          [audioId]
        );
      }
      
      const context = { 
        title: material.title + ' | راحة',
        user: req.session.user || null,
        material: material,
        related: relatedAudio,
        path: req.path
      };
      
      // Render the audio view template
      return res.render('pages/training/viewaudio', context);
      
    } catch (error) {
      console.error('Audio material view error:', error);
      return res.status(500).render('pages/error', { 
        title: 'خطأ 500 | راحة',
        message: 'حدث خطأ في تحميل الملف الصوتي',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' },
        user: req.session.user || null
      });
    }
  }
};

module.exports = trainingController;
