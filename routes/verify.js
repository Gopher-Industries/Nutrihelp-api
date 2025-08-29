// routes/verify.js
const express = require('express');
const router = express.Router();

// GET /api/verify-email/:token
router.get('/verify-email/:token', (req, res) => {
  const token = req.params.token || '';
  // Simple dev page for demo — replace with real verification logic later
  res.send(`
    <!doctype html>
    <html>
      <head><title>Email Verification</title></head>
      <body style="font-family: Arial; text-align:center; padding-top:50px;">
        <h1>✅ Email Verification</h1>
        <p>Your token:</p>
        <pre style="background:#eee;padding:10px;font-size:1.1rem;">${token}</pre>
        <p>This is a dev-only page for demo.</p>
      </body>
    </html>
  `);
});

module.exports = router;
