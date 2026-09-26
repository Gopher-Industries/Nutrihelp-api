const sanitizeHtml = require('sanitize-html');

const SANITIZE_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {}
};

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
  const before = JSON.stringify(req.body || {});

  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);

  const after = JSON.stringify(req.body || {});

  if (before !== after) {
    console.log(`⚠️  Input sanitized on ${req.method} ${req.originalUrl} (IP: ${req.ip})`);
  }

  next();
}

module.exports = sanitizeInput;