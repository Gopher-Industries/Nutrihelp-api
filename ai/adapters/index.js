/**
 * ai/adapters/index.js
 * 
 * Export main AI adapter for backend consumption
 */

const { AIAdapter, getAIAdapter, resetAIAdapter } = require('./AIAdapter');

module.exports = {
  AIAdapter,
  getAIAdapter,
  resetAIAdapter
};
