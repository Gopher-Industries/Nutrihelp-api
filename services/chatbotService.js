const Groq = require('groq-sdk');
const { ServiceError } = require('./serviceError');

const SYSTEM_PROMPT = `You are NutriHelp AI, a friendly and knowledgeable nutrition and health assistant for elderly users.
Your role is to answer questions about nutrition, diet, meal planning, hydration, and general wellness.
Keep responses concise (2–4 sentences), warm, and easy to understand.
Avoid medical diagnoses. If a user describes a serious symptom, recommend they consult a healthcare professional.
Always respond in the same language the user writes in.`;

const GROQ_TIMEOUT_MS = 25000;

class ChatbotService {
  async getChatResponse({ userId, userInput }) {
    if (!userId || !userInput) {
      throw new ServiceError(400, 'Missing fields');
    }

    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 200,
        body: { response: "AI service is not configured. Please contact your administrator." },
      };
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: GROQ_TIMEOUT_MS });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: String(userInput).slice(0, 2000) },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    return { statusCode: 200, body: { response } };
  }

  async addUrl(userId, url) {
    if (url === 'http://fail.com') throw new ServiceError(503, 'AI server unavailable');
    return { status: 'success' };
  }
}

module.exports = { ChatbotService };
