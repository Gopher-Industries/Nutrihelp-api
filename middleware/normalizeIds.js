/**
 * Middleware to convert string IDs like '123' to Numbers.
 * Prevents BigInt/UUID conversion crashes in controllers.
 */

function normalizeId(value) {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  return value;
}

module.exports = function normalizeIds(req, res, next) {
  // Normalize query params
  if (req.query) {
    for (const key in req.query) {
      if (req.query[key] && typeof req.query[key] === 'string') {
        req.query[key] = normalizeId(req.query[key]);
      }
    }
  }

  // Normalize body params
  if (req.body) {
    for (const key in req.body) {
      if (req.body[key] && typeof req.body[key] === 'string') {
        req.body[key] = normalizeId(req.body[key]);
      }
    }
  }

  next();
};
