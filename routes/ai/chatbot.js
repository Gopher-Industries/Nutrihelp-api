const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required"
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",   // ✅ YOUR WORKING MODEL
      messages: [
        { role: "user", content: query }
      ],
      temperature: 0.7,
    });

    res.json({
      success: true,
      data: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;