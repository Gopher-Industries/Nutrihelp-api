const express = require('express');
const router = express.Router();

// STEP 1: AUTHORIZE (already working)
router.get('/authorize', (req, res) => {
  const { redirect_uri } = req.query;

  console.log("✅ OAuth Authorize hit");

  const code = "dummy_auth_code_123";

  res.redirect(`${redirect_uri}?code=${code}`);
});

// STEP 2: TOKEN (VERY IMPORTANT)
router.post('/token', (req, res) => {
  console.log("✅ OAuth Token hit");

  res.json({
    access_token: "test_access_token_123",
    refresh_token: "test_refresh_token_123",
    expires_in: 3600,
    token_type: "Bearer"
  });
});

module.exports = router;