require('dotenv').config(); // ✅ VERY IMPORTANT

const jwt = require('jsonwebtoken');

console.log("SECRET:", process.env.AI_JWT_SECRET); // debug

const token = jwt.sign(
  {
    id: "123",
    type: "ai",
    role: "ai-service"
  },
  process.env.AI_JWT_SECRET, // must not be undefined
  { expiresIn: "1h" }
);

console.log("TOKEN:\n", token);