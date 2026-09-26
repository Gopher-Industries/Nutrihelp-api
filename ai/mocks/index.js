/**
 * ai/mocks/index.js
 * 
 * Export all mock AI clients for testing and development
 */

const { MockChatbotClient } = require('./MockChatbotClient');
const { MockMedicalPredictionClient } = require('./MockMedicalPredictionClient');
const { MockImageClassificationClient } = require('./MockImageClassificationClient');

module.exports = {
  MockChatbotClient,
  MockMedicalPredictionClient,
  MockImageClassificationClient
};
