module.exports = (app) => {
  // Core mounts
  app.use("/api/appointments", require("./appointment"));
  app.use("/api/health-news", require("./healthNews"));
  app.use("/api/food", require("./fooddata"));
  app.use("/api/shopping-list", require("./shoppingList"));
  app.use("/api/water", require("./waterIntake"));
  app.use("/api/barcode", require("./barcodeScanning"));
  app.use("/api/recipes", require("./recipe"));

  // Articles
  try {
    app.use("/api/articles", require("./articles"));
    console.log('Mounted route: /api/articles');
  } catch (e) {
    console.warn('Could not mount /api/articles:', e.message || e);
  }

  // Backwards-compatible recipe mounts and utility subroutes
  try {
    app.use("/api/recipe", require("./recipe")); // keeps both '/api/recipes' and '/api/recipe' working
  } catch (e) {
    console.warn('Could not mount /api/recipe:', e.message || e);
  }

  try {
    app.use("/api/recipe/nutrition", require("./recipeNutritionlog"));
    console.log('Mounted route: /api/recipe/nutrition');
  } catch (e) {
    console.warn('Could not mount /api/recipe/nutrition:', e.message || e);
  }

  try {
    app.use("/api/recipe/scale", require("./recipeScaling"));
    console.log('Mounted route: /api/recipe/scale');
  } catch (e) {
    console.warn('Could not mount /api/recipe/scale:', e.message || e);
  }
const { registerRouteGroups } = require('./routeGroups');

module.exports = (app) => {
  registerRouteGroups(app);
};
