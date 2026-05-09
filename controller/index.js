module.exports = {
  authAndIdentity: {
    get auth() {
      return require('./authController');
    },
    get userProfile() {
      return require('./userProfileController');
    },
    get updateUserProfile() {
      return require('./updateUserProfileController');
    },
    get notifications() {
      return require('./notificationController');
    },
  },
  coreApp: {
    get appointments() {
      return require('./appointmentController');
    },
    get mealplan() {
      return require('./mealplanController');
    },
    get recommendations() {
      return require('./recommendationController');
    },
    get shoppingList() {
      return require('./shoppingListController');
    },
  },
  contentAndSupport: {
    get articles() {
      return require('./healthArticleController');
    },
    get contact() {
      return require('./contactusController');
    },
    get feedback() {
      return require('./userFeedbackController');
    },
  },
  aiAndMedical: {
    get chatbot() {
      return require('./chatbotController');
    },
    get mealPlanAI() {
      return require('./mealPlanAIController');
    },
    get medicalPrediction() {
      return require('./medicalPredictionController');
    },
    get healthPlan() {
      return require('./healthPlanController');
    },
  },
};
