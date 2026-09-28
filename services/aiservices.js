const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function chat(prompt) {
  const response = await groq.chat.completions.create({
    model: "llama3-70b-8192",   // ✅ WORKING MODEL
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = { chat };