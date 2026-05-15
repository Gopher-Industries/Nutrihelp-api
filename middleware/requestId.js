const crypto = require("crypto");

// attach unique request id to every request
const requestId = (req, res, next) => {
  const id = crypto.randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  next();
};

module.exports = requestId;
