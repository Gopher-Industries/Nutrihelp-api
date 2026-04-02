/**
 * ai/index.js
 * 
 * Main entry point for AI module exports
 * Use this for importing AI functionality anywhere in the application
 */

// Adapters - What controllers should use
const { AIAdapter, getAIAdapter, resetAIAdapter } = require('./adapters');

// Interfaces - For understanding service contracts
const {
  AIClientInterface,
  ChatbotAIClientInterface,
  MedicalPredictionAIClientInterface,
  ImageClassificationAIClientInterface,
  RecommendationAIClientInterface
} = require('./interfaces');

// Clients - Direct implementations (advanced use only)
const {
  ExternalAIServerClient,
  ExternalChatbotClient,
  ExternalMedicalPredictionClient,
  PythonImageClassificationClient,
  GroqChatbotClient,
  ChromaRecommendationClient
} = require('./clients');

// Mocks - For testing
const {
  MockChatbotClient,
  MockMedicalPredictionClient,
  MockImageClassificationClient
} = require('./mocks');

/**
 * RECOMMENDED USAGE:
 * 
 * // In any controller or service
 * const { getAIAdapter } = require('./ai');
 * 
 * const aiAdapter = getAIAdapter();
 * const response = await aiAdapter.generateChatResponse({ query });
 * 
 * See ./SUMMARY.md for quick reference
 * See ./README.md for complete architecture guide
 * See ./MIGRATION_GUIDE.md for implementation examples
 */

module.exports = {
  // MAIN ADAPTER - Use this!
  getAIAdapter,
  AIAdapter,
  resetAIAdapter,

  // Interfaces (for developers, type hints)
  AIClientInterface,
  ChatbotAIClientInterface,
  MedicalPredictionAIClientInterface,
  ImageClassificationAIClientInterface,
  RecommendationAIClientInterface,

  // Client Implementations (advanced)
  ExternalAIServerClient,
  ExternalChatbotClient,
  ExternalMedicalPredictionClient,
  PythonImageClassificationClient,
  GroqChatbotClient,
  ChromaRecommendationClient,

  // Mocks (for testing)
  MockChatbotClient,
  MockMedicalPredictionClient,
  MockImageClassificationClient
};
