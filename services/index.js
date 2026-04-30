module.exports = {
  authAndIdentity: {
    get authService() {
      return require('./authService');
    },
    get userProfileService() {
      return require('./userProfileService');
    },
    get serviceError() {
      return require('./serviceError');
    },
  },
  shared: {
    get apiResponse() {
      return require('./apiResponseService');
    },
  },
  coreApp: {
    get recommendationService() {
      return require('./recommendationService');
    },
    get shoppingListService() {
      return require('./shoppingListService');
    },
  },
  aiAndMedical: {
    get chatbotService() {
      return require('./chatbotService');
    },
    get medicalPredictionService() {
      return require('./medicalPredictionService');
    },
    get mealPlanAIService() {
      return require('./mealPlanAIService');
    },
  },
};
