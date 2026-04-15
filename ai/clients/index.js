/**
 * ai/clients/index.js
 * 
 * Export all AI client implementations
 */

const {
  ExternalAIServerClient,
  ExternalChatbotClient,
  ExternalMedicalPredictionClient
} = require('./ExternalAIServerClient');

const { PythonImageClassificationClient } = require('./PythonScriptClient');

const { GroqChatbotClient } = require('./GroqClient');

const { ChromaRecommendationClient } = require('./ChromaClient');

module.exports = {
  // External AI Server
  ExternalAIServerClient,
  ExternalChatbotClient,
  ExternalMedicalPredictionClient,
  
  // Python-based models
  PythonImageClassificationClient,
  
  // Groq LLM (future)
  GroqChatbotClient,
  
  // Chroma RAG (future)
  ChromaRecommendationClient
};
