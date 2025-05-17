/**
 * Internationalization middleware for Raha3
 * Provides translation functionality for templates using JSON files in the locales directory
 */
const fs = require('fs');
const path = require('path');

// Load translation files
const translations = {};
const localesDir = path.join(__dirname, '../locales');

// Check if locales directory exists
if (fs.existsSync(localesDir)) {
  // Read all files in the locales directory
  const files = fs.readdirSync(localesDir);
  
  // Load each translation file
  files.forEach(file => {
    if (file.endsWith('.json')) {
      const locale = file.replace('.json', '');
      try {
        const filePath = path.join(localesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        translations[locale] = JSON.parse(content);
        console.log(`Loaded translations for ${locale}`);
      } catch (error) {
        console.error(`Error loading translations for ${locale}:`, error);
      }
    }
  });
} else {
  console.warn('Locales directory not found. Translations will not be available.');
}

module.exports = (req, res, next) => {
  // Determine the user's preferred locale
  // This can be expanded to check headers, cookies, or user preferences
  let locale = req.query.lang || 'ar'; // Default to Arabic for now
  
  // Fallback to 'en' if the requested locale is not available
  if (!translations[locale]) {
    locale = 'en';
  }
  
  // Add the __ function to res.locals so it's available in all templates
  res.locals.__ = function(text) {
    // If translations exist for this locale and this text
    if (translations[locale] && translations[locale][text]) {
      return translations[locale][text];
    }
    
    // Fallback to English if available
    if (locale !== 'en' && translations['en'] && translations['en'][text]) {
      return translations['en'][text];
    }
    
    // If no translation is found, return the original text
    return text;
  };
  
  // Set locale for date formatting
  res.locals.locale = locale === 'ar' ? 'ar-SA' : 'en-US';
  
  // Make the current locale available to templates
  res.locals.currentLocale = locale;
  
  next();
};
