const routeGroups = [
  {
    name: 'auth-and-identity',
    routes: [
      ['/api/auth', './auth'],
      ['/api/login', './login'],
      ['/api/signup', './signup'],
      ['/api/account', './account'],
      ['/api/profile', './profile'],
      ['/api/userprofile', './userprofile'],
      ['/api/userpassword', './userpassword'],
      ['/api/password', './password'],
      ['/api/notifications', './notifications'],
      ['/api/user/preferences', './userPreferences'],
    ],
  },
  {
    name: 'core-app',
    routes: [
      ['/api/home/services', './homeService'],
      ['/api/home/subscribe', './homeSubscribe'],
      ['/api/recipe', './recipe'],
      ['/api/appointments', './appointment'],
      ['/api/mealplan', './mealplan'],
      ['/api/shopping-list', './shoppingList'],
      ['/api/recommendations', './recommendations'],
      ['/api/filter', './filter'],
      ['/api/substitution', './ingredientSubstitution'],
      ['/api/recipe/cost', './costEstimation'],
      ['/api/recipe/nutritionlog', './recipeNutritionlog'],
      ['/api/recipe/scale', './recipeScaling'],
      ['/api/water-intake', './waterIntake'],
    ],
  },
  {
    name: 'content-and-support',
    routes: [
      ['/api/contactus', './contactus'],
      ['/api/userfeedback', './userfeedback'],
      ['/api/articles', './articles'],
      ['/api/health-news', './healthNews'],
      ['/api/health-tools', './healthTools'],
      ['/api/fooddata', './fooddata'],
    ],
  },
  {
    name: 'ai-and-medical',
    routes: [
      ['/api/chatbot', './chatbot'],
      ['/api/imageClassification', './imageClassification'],
      ['/api/recipeImageClassification', './recipeImageClassification'],
      ['/api/medical-report', './medicalPrediction'],
      ['/api/meal-plan', './mealPlanAIRoutes'],
      ['/api/barcode', './barcodeScanning'],
    ],
  },
  {
    name: 'platform-and-upload',
    routes: [
      ['/api/upload', './upload'],
      ['/api/security', './securityEvents'],
    ],
  },
  {
    name: 'health-checks',
    routes: [
      ['/api/health/encryption', './encryptionHealth'],
    ],
  },
];

function registerRouteGroups(app) {
  for (const group of routeGroups) {
    for (const [mountPath, modulePath] of group.routes) {
      app.use(mountPath, require(modulePath));
    }
  }
}

module.exports = {
  routeGroups,
  registerRouteGroups,
};
