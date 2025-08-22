module.exports = app => {
    app.use("/api/login", require('./login'));
    app.use("/api/signup", require('./signup'));
    app.use("/api/contactus", require('./contactus'));
    app.use("/api/userfeedback", require('./userfeedback'));
    app.use("/api/recipe", require('./recipe'));
    app.use("/api/appointments", require('./appointment'));
    app.use("/api/imageClassification", require('./imageClassification'));
    app.use("/api/recipeImageClassification", require('./recipeImageClassification'));
    app.use("/api/userprofile", require('./userprofile')); // get profile, update profile, update by identifier (email or username)
    app.use("/api/userpassword", require('./userpassword'));
    app.use("/api/fooddata", require('./fooddata'));
    app.use("/api/user/preferences", require('./userPreferences'));
    app.use("/api/mealplan", require('./mealplan'));
    app.use("/api/account", require('./account'));
    app.use('/api/notifications', require('./notifications'));
    app.use('/api/filter', require('./filter'));
    app.use('/api/substitution', require('./ingredientSubstitution'));
    app.use('/api/auth', require('./auth'));
    app.use('/api/recipe/cost', require('./costEstimation'));
    app.use('/api/chatbot', require('./chatbot'));
    // app.use('/api/obesity', require('./obesityPrediction'));
    app.use('/api/upload', require('./upload'));
    app.use('/api/upload', require('./upload'));
    app.use("/api/articles", require('./articles'));
    app.use('/api/chatbot', require('./chatbot'));
    app.use('/api/medical-report', require('./medicalPrediction'));
    app.use('/api/recipe/nutritionlog', require('./recipeNutritionlog'));
    app.use('/api/recipe/scale', require('./recipeScaling'));
    app.use('/api/water-intake', require('./waterIntake'));
    app.use('/api/health-news', require('./healthNews'));
    app.use('/api/barcode', require('./barcodeScanning'));

};