// Authentication middleware

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Check if user is a psychologist
const isPsychologist = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'psychologist') {
    return next();
  }
  res.status(403).render('pages/error', { 
    message: 'u063au064au0631 u0645u0635u0631u062d u0628u0627u0644u0648u0635u0648u0644', 
    error: { status: 403, stack: '' } 
  });
};

// Check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).render('pages/error', { 
    message: 'u063au064au0631 u0645u0635u0631u062d u0628u0627u0644u0648u0635u0648u0644', 
    error: { status: 403, stack: '' } 
  });
};

// Make user data available to all views
const setLocals = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};

// Restrict psychologists' access to only their designated pages and session join route
const restrictPsychologistAccess = (req, res, next) => {
  // Only apply restrictions to authenticated psychologists
  if (req.session.user && req.session.user.role === 'psychologist') {
    const path = req.path;
    
    // Allow access to psychologist pages
    if (path.startsWith('/psychologist')) {
      return next();
    }

    if (path.startsWith('/dashboard/change-password')) {
      return next();
    }
    
    // Allow access to session join routes
    if (path.match(/^\/sessions\/[0-9]+\/join$/)) {
      return next();
    }
    
    // Allow access to static resources
    if (path.startsWith('/css') || path.startsWith('/js') || path.startsWith('/images') || path.startsWith('/uploads')) {
      return next();
    }
    
    // Allow access to socket.io endpoints for video sessions
    if (path.startsWith('/socket.io')) {
      return next();
    }
    
    // Allow access to the logout route
    if (path === '/auth/logout') {
      return next();
    }
    
    // Redirect to psychologist dashboard for unauthorized access
    console.log(`Psychologist restricted from accessing: ${path}`);
    return res.redirect('/psychologist/dashboard');
  }
  
  // For non-psychologists, proceed normally
  next();
};

module.exports = {
  isAuthenticated,
  isPsychologist,
  isAdmin,
  setLocals,
  restrictPsychologistAccess
};
