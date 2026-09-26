/**
 * ai/interfaces/index.js
 * 
 * Export all AI client interfaces
 */

const AIClientInterface = require('./AIClientInterface');
const ChatbotAIClientInterface = require('./ChatbotAIClientInterface');
const MedicalPredictionAIClientInterface = require('./MedicalPredictionAIClientInterface');
const ImageClassificationAIClientInterface = require('./ImageClassificationAIClientInterface');
const RecommendationAIClientInterface = require('./RecommendationAIClientInterface');

module.exports = {
  AIClientInterface,
  ChatbotAIClientInterface,
  MedicalPredictionAIClientInterface,
  ImageClassificationAIClientInterface,
  RecommendationAIClientInterface
};
