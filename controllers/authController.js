const User = require('../models/User');

const authController = {
  // Render login page
  getLogin: (req, res) => {
    res.render('pages/auth/login', { title: 'تسجيل الدخول | راحة', error: null });
  },
  
  // Process login
  postLogin: async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.render('pages/auth/login', { 
          title: 'تسجيل الدخول | راحة', 
          error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' 
        });
      }
      
      // Authenticate user (using email as username)
      const user = await User.authenticate(username, password);
      
      if (!user) {
        return res.render('pages/auth/login', { 
          title: 'تسجيل الدخول | راحة', 
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
        });
      }
      
      // Set user session
      req.session.user = user;
      
      // Redirect based on role
      if (user.role === 'psychologist') {
        res.redirect('/psychologist/sessions');
      } else if (user.role === 'admin') {
        res.redirect('/admin/dashboard');
      } else {
        res.redirect('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      res.render('pages/auth/login', { 
        title: 'تسجيل الدخول | راحة', 
        error: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.' 
      });
    }
  },
  
  // Render registration page
  getRegister: (req, res) => {
    res.render('pages/auth/register', { title: 'إنشاء حساب | راحة', error: null });
  },
  
  // Process registration
  postRegister: async (req, res) => {
    try {
      const { email, password, confirm_password, first_name, last_name, gender, marital_status, role } = req.body;
      // We'll use email as username for compatibility with the updated model
      const username = email;
      
      // Validate input
      if (!email || !password || !confirm_password || !first_name || !last_name || !gender || !marital_status || !role) {
        return res.render('pages/auth/register', { 
          title: 'إنشاء حساب | راحة', 
          error: 'جميع الحقول مطلوبة' 
        });
      }
      
      // Validate role
      if (role !== 'employee' && role !== 'psychologist') {
        return res.render('pages/auth/register', { 
          title: 'إنشاء حساب | راحة', 
          error: 'نوع الحساب غير صالح' 
        });
      }
      
      if (password !== confirm_password) {
        return res.render('pages/auth/register', { 
          title: 'إنشاء حساب | راحة', 
          error: 'كلمات المرور غير متطابقة' 
        });
      }
      
      // Check if email already exists (email is now used as username)
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.render('pages/auth/register', { 
          title: 'إنشاء حساب | راحة', 
          error: 'البريد الإلكتروني مستخدم بالفعل' 
        });
      }
      
      // Create new user with the selected role
      const userData = {
        name: `${first_name} ${last_name}`.trim(),
        email,
        password,
        gender,
        marital_status,
        role
      };
      
      const newUser = await User.create(userData);
      
      // Set user session
      req.session.user = newUser;
      
      // If user is a psychologist, show a message about account verification
      if (role === 'psychologist') {
        return res.render('pages/auth/register-success', {
          title: 'تم إنشاء الحساب | راحة',
          message: 'تم إنشاء حسابك كمعالج نفسي بنجاح. سيتم مراجعة حسابك وتفعيله قريباً.',
          user: newUser
        });
      }
      
      // Redirect to dashboard for regular employees
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      res.render('pages/auth/register', { 
        title: 'إنشاء حساب | راحة', 
        error: 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.' 
      });
    }
  },
  
  // Logout
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  }
};

module.exports = authController;
