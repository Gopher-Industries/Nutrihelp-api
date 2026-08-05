// middleware/sanitizeInput.js
const sanitizeHtml = require('sanitize-html');

const SANITIZE_OPTIONS = {
  allowedTags: [], // Strip all HTML tags
  allowedAttributes: {}, // Strip all attributes
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe'] // Wipe script tags and their content
};

// Simple helper to clean strings, objects, or arrays
function clean(data) {
  if (typeof data === 'string') {
    return sanitizeHtml(data, SANITIZE_OPTIONS);
  }
  if (Array.isArray(data)) {
    return data.map(clean);
  }
  if (data !== null && typeof data === 'object') {
    for (const key in data) {
      data[key] = clean(data[key]);
    }
  }
  return data;
}

function sanitizeInput(req, res, next) {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  
  next();
}   

module.exports = sanitizeInput;
