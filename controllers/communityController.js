const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

const communityController = {
  // Get community home page
  getCommunityHome: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      // Get posts
      const posts = await Post.getAll(limit, offset);
      
      // Get total posts count for pagination
      const db = require('../config/database');
      const totalPosts = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM posts', [], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.count : 0);
          }
        });
      });
      
      const totalPages = Math.ceil(totalPosts / limit);
      
      res.render('pages/community/index', { 
        title: 'مجتمع راحة',
        user: req.session.user,
        posts,
        currentPage: page,
        totalPages,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Community home error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل صفحة المجتمع',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get create post page
  getCreatePost: (req, res) => {
    res.render('pages/community/create-post', { 
      title: 'إنشاء منشور جديد | راحة',
      user: req.session.user,
      error: null
    });
  },
  
  // Process create post
  postCreatePost: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { title, content } = req.body;
      
      // Validate input
      if (!title || !content) {
        return res.render('pages/community/create-post', { 
          title: 'إنشاء منشور جديد | راحة',
          user: req.session.user,
          error: 'يرجى ملء جميع الحقول المطلوبة'
        });
      }
      
      // Create post
      const postData = {
        user_id: userId,
        title,
        content
      };
      
      const post = await Post.create(postData);
      
      // Redirect to the post
      res.redirect(`/community/post/${post.id}?success=تم إنشاء المنشور بنجاح`);
    } catch (error) {
      console.error('Create post error:', error);
      res.render('pages/community/create-post', { 
        title: 'إنشاء منشور جديد | راحة',
        user: req.session.user,
        error: 'حدث خطأ أثناء إنشاء المنشور. يرجى المحاولة مرة أخرى.'
      });
    }
  },
  
  // Get post details
  getPost: async (req, res) => {
    try {
      const postId = req.params.id;
      
      // Get the post
      const post = await Post.findById(postId);
      
      // Check if post exists
      if (!post) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على المنشور',
          error: { status: 404, stack: '' }
        });
      }
      
      // Get comments for the post
      const comments = await Comment.getByPostId(postId);
      
      res.render('pages/community/post', { 
        title: `${post.title} | راحة`,
        user: req.session.user,
        post,
        comments,
        success: req.query.success,
        error: req.query.error
      });
    } catch (error) {
      console.error('Post view error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل المنشور',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Get edit post page
  getEditPost: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.session.user.id;
      
      // Get the post
      const post = await Post.findById(postId);
      
      // Check if post exists and belongs to the user
      if (!post || post.user_id !== userId) {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بتحرير هذا المنشور',
          error: { status: 403, stack: '' }
        });
      }
      
      res.render('pages/community/edit-post', { 
        title: 'تحرير المنشور | راحة',
        user: req.session.user,
        post,
        error: null
      });
    } catch (error) {
      console.error('Edit post form error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل نموذج تحرير المنشور',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Process edit post
  postEditPost: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.session.user.id;
      const { title, content } = req.body;
      
      // Validate input
      if (!title || !content) {
        // Get the post for the form
        const post = await Post.findById(postId);
        
        return res.render('pages/community/edit-post', { 
          title: 'تحرير المنشور | راحة',
          user: req.session.user,
          post,
          error: 'يرجى ملء جميع الحقول المطلوبة'
        });
      }
      
      // Update post
      await Post.update(postId, userId, { title, content });
      
      // Redirect to the post
      res.redirect(`/community/post/${postId}?success=تم تحديث المنشور بنجاح`);
    } catch (error) {
      console.error('Edit post error:', error);
      
      if (error.message === 'Post not found or not authorized') {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بتحرير هذا المنشور',
          error: { status: 403, stack: '' }
        });
      }
      
      // Get the post for the form
      const post = await Post.findById(req.params.id);
      
      res.render('pages/community/edit-post', { 
        title: 'u062au062du0631u064au0631 u0627u0644u0645u0646u0634u0648u0631 | u0631u0627u062du0629',
        user: req.session.user,
        post,
        error: 'u062du062fu062b u062eu0637u0623 u0623u062bu0646u0627u0621 u062au062du062fu064au062b u0627u0644u0645u0646u0634u0648u0631. u064au0631u062cu0649 u0627u0644u0645u062du0627u0648u0644u0629 u0645u0631u0629 u0623u062eu0631u0649.'
      });
    }
  },
  
  // Delete post
  deletePost: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.session.user.id;
      
      // Delete post
      await Post.delete(postId, userId);
      
      // Redirect to community home
      res.redirect('/community?success=تم حذف المنشور بنجاح');
    } catch (error) {
      console.error('Delete post error:', error);
      
      if (error.message === 'Post not found or not authorized') {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بحذف هذا المنشور',
          error: { status: 403, stack: '' }
        });
      }
      
      res.redirect(`/community/post/${req.params.id}?error=حدث خطأ أثناء حذف المنشور`);
    }
  },
  
  // Add comment
  addComment: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.session.user.id;
      const { content } = req.body;
      
      // Validate input
      if (!content) {
        return res.redirect(`/community/post/${postId}?error=يرجى إدخال محتوى التعليق`);
      }
      
      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على المنشور',
          error: { status: 404, stack: '' }
        });
      }
      
      // Create comment
      const commentData = {
        post_id: parseInt(postId),
        user_id: userId,
        content
      };
      
      await Comment.create(commentData);
      
      // Redirect to the post
      res.redirect(`/community/post/${postId}?success=تم إضافة التعليق بنجاح`);
    } catch (error) {
      console.error('Add comment error:', error);
      res.redirect(`/community/post/${req.params.id}?error=حدث خطأ أثناء إضافة التعليق`);
    }
  },
  
  // Delete comment
  deleteComment: async (req, res) => {
    try {
      const commentId = req.params.id;
      const userId = req.session.user.id;
      
      // Get the comment to find the post ID
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على التعليق',
          error: { status: 404, stack: '' }
        });
      }
      
      const postId = comment.post_id;
      
      // Delete comment
      await Comment.delete(commentId, userId);
      
      // Redirect to the post
      res.redirect(`/community/post/${postId}?success=تم حذف التعليق بنجاح`);
    } catch (error) {
      console.error('Delete comment error:', error);
      
      if (error.message === 'Comment not found or not authorized') {
        return res.status(403).render('pages/error', { 
          message: 'غير مصرح لك بحذف هذا التعليق',
          error: { status: 403, stack: '' }
        });
      }
      
      // Try to get the comment to find the post ID
      try {
        const comment = await Comment.findById(req.params.id);
        if (comment) {
          return res.redirect(`/community/post/${comment.post_id}?error=حدث خطأ أثناء حذف التعليق`);
        }
      } catch (err) {
        // Ignore error
      }
      
      // If we can't find the post ID, redirect to community home
      res.redirect('/community?error=حدث خطأ أثناء حذف التعليق');
    }
  },
  
  // Get user posts
  getUserPosts: async (req, res) => {
    try {
      const userId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      // Get user
      const user = await User.findById(userId);
      
      // Check if user exists
      if (!user) {
        return res.status(404).render('pages/error', { 
          message: 'لم يتم العثور على المستخدم',
          error: { status: 404, stack: '' }
        });
      }
      
      // Get user posts
      const posts = await Post.getByUserId(userId, limit, offset);
      
      // Get total posts count for pagination
      const totalPosts = await new Promise((resolve, reject) => {
        req.app.locals.db.get('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [userId], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        });
      });
      
      const totalPages = Math.ceil(totalPosts / limit);
      
      res.render('pages/community/user-posts', { 
        title: `منشورات ${user.first_name} ${user.last_name} | راحة`,
        user: req.session.user,
        profileUser: user,
        posts,
        currentPage: page,
        totalPages
      });
    } catch (error) {
      console.error('User posts error:', error);
      res.status(500).render('pages/error', { 
        message: 'حدث خطأ في تحميل منشورات المستخدم',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  },
  
  // Search posts
  searchPosts: async (req, res) => {
    try {
      const { query } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      // Validate query
      if (!query) {
        return res.redirect('/community');
      }
      
      // Search posts
      const posts = await Post.search(query, limit, offset);
      
      // Get total posts count for pagination
      const totalPosts = await new Promise((resolve, reject) => {
        req.app.locals.db.get('SELECT COUNT(*) as count FROM posts WHERE title LIKE ? OR content LIKE ?', 
          [`%${query}%`, `%${query}%`], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        });
      });
      
      const totalPages = Math.ceil(totalPosts / limit);
      
      res.render('pages/community/search', { 
        title: `u0646u062au0627u0626u062c u0627u0644u0628u062du062b: ${query} | u0631u0627u062du0629`,
        user: req.session.user,
        posts,
        query,
        currentPage: page,
        totalPages
      });
    } catch (error) {
      console.error('Search posts error:', error);
      res.status(500).render('pages/error', { 
        message: 'u062du062fu062b u062eu0637u0623 u0641u064a u0627u0644u0628u062du062b u0639u0646 u0627u0644u0645u0646u0634u0648u0631u0627u062a',
        error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
      });
    }
  }
};

module.exports = communityController;
