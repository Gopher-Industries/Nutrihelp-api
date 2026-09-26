const express = require('express');
const router = express.Router();

// Intentionally trigger an error to test error logging
router.post('/trigger', (req, res, next) => {
  const simulate = req.body && req.body.simulate ? req.body.simulate : 'basic';

  if (simulate === 'throw') {
    // throw synchronously
    throw new Error('Simulated synchronous error from /api/system/test-error/trigger');
  }

  if (simulate === 'next') {
    // pass to next error handler
    return next(new Error('Simulated async error via next() from /api/system/test-error/trigger'));
  }

  // default: create an error after a tick (simulate async failure)
  setTimeout(() => {
    next(new Error('Simulated delayed error from /api/system/test-error/trigger'));
  }, 10);
});

module.exports = router;
