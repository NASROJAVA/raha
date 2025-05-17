/**
 * Middleware to handle EJS template rendering options
 */
const viewMiddleware = {
  // Enable async support for specific routes
  enableAsyncTemplates: (req, res, next) => {
    // Store the original render method
    const originalRender = res.render;
    
    // Override the render method with one that includes async option
    res.render = function(view, options, callback) {
      // Add the async option to all render calls
      const renderOptions = Object.assign({}, options || {}, { async: true });
      
      // Call the original render with our modified options
      return originalRender.call(this, view, renderOptions, callback);
    };
    
    next();
  }
};

module.exports = viewMiddleware;
