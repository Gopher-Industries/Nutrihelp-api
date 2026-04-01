const { generateRecommendations } = require("../recommendationService");

async function generateMobileRecommendations(payload) {
  return generateRecommendations(payload);
}

module.exports = {
  generateMobileRecommendations,
};
