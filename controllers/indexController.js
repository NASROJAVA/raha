const indexController = {
  // Render home page
  getHomePage: (req, res) => {
    // Use a simple object for context to avoid any circular references
    const renderData = { 
      title: 'راحة | منصة للصحة النفسية في مكان العمل',
      user: req.session.user || null
    };
    
    // Prevent trying to display the object directly
    res.render('pages/index', renderData);
  },
  
  // Render about page
  getAboutPage: (req, res) => {
    res.render('pages/about', { 
      title: 'عن راحة | منصة للصحة النفسية في مكان العمل',
      user: req.session.user || null
    });
  },
  
  // Render contact page
  getContactPage: (req, res) => {
    res.render('pages/contact', { 
      title: 'اتصل بنا | راحة',
      user: req.session.user || null
    });
  }
};

module.exports = indexController;
