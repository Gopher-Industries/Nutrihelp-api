<!--
Global Search for Health Data Keywords

profile or profiles
allergy or allergies
meal_plan or meal_plans
health_condition or health_metrics
symptom or symptoms
nutrient or nutrition
-->

### Search: profile
File: Nutrihelp-api\index.yaml Line: /userprofile:
File: Nutrihelp-api\index.yaml Line: summary: Get user profile
File: Nutrihelp-api\index.yaml Line: - Normal users can only fetch their own profile.
File: Nutrihelp-api\index.yaml Line: - Admins can fetch any profile using `?email=xxx`.
File: Nutrihelp-api\index.yaml Line: description: (Admin only) Email of the user whose profile to fetch
File: Nutrihelp-api\index.yaml Line: description: User profile fetched successfully
File: Nutrihelp-api\index.yaml Line: $ref: '#/components/schemas/UserProfileResponse'
File: Nutrihelp-api\index.yaml Line: summary: Update user profile
File: Nutrihelp-api\index.yaml Line: - Normal users can update only their own profile.
File: Nutrihelp-api\index.yaml Line: - Admins can update any profile using `email`.
File: Nutrihelp-api\index.yaml Line: description: User profile updated successfully
File: Nutrihelp-api\index.yaml Line: /auth/profile:
File: Nutrihelp-api\index.yaml Line: summary: Get User Profile
File: Nutrihelp-api\index.yaml Line: description: Profile retrieved successfully
File: Nutrihelp-api\index.yaml Line: UserProfileResponse:
File: Nutrihelp-api\jwt routes.js Line: router.get('/profile', authenticateToken, authController.getProfile);
File: Nutrihelp-api\package-lock.json Line: "node_modules/aws-ssl-profiles": {
File: Nutrihelp-api\package-lock.json Line: "resolved": "https://registry.npmjs.org/aws-ssl-profiles/-/aws-ssl-profiles-1.1.2.tgz",
File: Nutrihelp-api\package-lock.json Line: "aws-ssl-profiles": "^1.1.1",
File: Nutrihelp-api\PatchNotes_VersionControl.yaml Line: - Added Image to User profile API
File: Nutrihelp-api\PatchNotes_VersionControl.yaml Line: - User Profile Controller
File: Nutrihelp-api\PatchNotes_VersionControl.yaml Line: - Get User Profile
File: Nutrihelp-api\PatchNotes_VersionControl.yaml Line: - Update User Profile
File: Nutrihelp-api\PatchNotes_VersionControl.yaml Line: - User Profile
File: Nutrihelp-api\controller\authController.js Line: * Get Current User Profile

### Search: allergy
File: Nutrihelp-api\index.yaml Line: - name: Allergy
File: Nutrihelp-api\index.yaml Line: description: Endpoints for allergy checks and warnings
File: Nutrihelp-api\index.yaml Line: /allergy/common:
File: Nutrihelp-api\index.yaml Line: tags: [Allergy]
File: Nutrihelp-api\index.yaml Line: /allergy/check:
File: Nutrihelp-api\index.yaml Line: tags: [Allergy]
File: Nutrihelp-api\index.yaml Line: summary: Check a meal against user allergies
File: Nutrihelp-api\index.yaml Line: description: Returns which of the user's allergies are present in the meal's ingredients.
File: Nutrihelp-api\index.yaml Line: $ref: '#/components/schemas/AllergyCheckRequest'
File: Nutrihelp-api\index.yaml Line: userAllergies: ["peanuts","milk"]
File: Nutrihelp-api\index.yaml Line: description: Allergy check result
File: Nutrihelp-api\index.yaml Line: $ref: '#/components/schemas/AllergyCheckResponse'
File: Nutrihelp-api\index.yaml Line: /fooddata/allergies:
File: Nutrihelp-api\index.yaml Line: summary: Get allergies
File: Nutrihelp-api\index.yaml Line: description: Retrieves a list of allergies
File: Nutrihelp-api\index.yaml Line: description: List of allergies
File: Nutrihelp-api\index.yaml Line: allergies:
File: Nutrihelp-api\index.yaml Line: allergies:
File: Nutrihelp-api\index.yaml Line: allergies:
File: Nutrihelp-api\index.yaml Line: allergies: [ 1 ]
File: Nutrihelp-api\index.yaml Line: description: Retrieves substitution options for a specific ingredient, with optional filtering by allergies, dietary requirements, and health conditions.
File: Nutrihelp-api\index.yaml Line: - name: allergies
File: Nutrihelp-api\index.yaml Line: description: List of allergy IDs to exclude from substitutions. Pass as a comma-separated string.
File: Nutrihelp-api\index.yaml Line: - name: allergies
File: Nutrihelp-api\index.yaml Line: example: "Allergy type not found"

### Search: meal_plan
File: Nutrihelp-api\index.yaml Line: - meal_plan_ids
File: Nutrihelp-api\index.yaml Line: meal_plan_ids:
File: Nutrihelp-api\controller\mealplanController.js Line: let meal_plan = await add(user_id, { recipe_ids: recipe_ids }, meal_type);
File: Nutrihelp-api\controller\mealplanController.js Line: await saveMealRelation(user_id, recipe_ids, meal_plan[0].id);
File: Nutrihelp-api\controller\mealplanController.js Line: return res.status(201).json({ message: 'success', statusCode: 201, meal_plan: meal_plan });
File: Nutrihelp-api\controller\mealplanController.js Line: let meal_plans = await get(user_id);
File: Nutrihelp-api\controller\mealplanController.js Line: if (meal_plans) {
File: Nutrihelp-api\controller\mealplanController.js Line: return res.status(200).json({ message: 'success', statusCode: 200, meal_plans: meal_plans });
File: Nutrihelp-api\controller\shoppingListController.js Line: const { user_id, meal_plan_ids, meal_types } = req.body;
File: Nutrihelp-api\controller\shoppingListController.js Line: if (!user_id || !meal_plan_ids || !Array.isArray(meal_plan_ids)) {
File: Nutrihelp-api\controller\shoppingListController.js Line: .in('mealplan_id', meal_plan_ids)
File: Nutrihelp-api\model\getMealPlanByUserIdAndDate.js Line: let query = supabase.from('meal_plan').select('created_at, recipes, meal_type');
File: Nutrihelp-api\model\mealPlan.js Line: .from('meal_plan')
File: Nutrihelp-api\model\mealPlan.js Line: .from('meal_plan')
File: Nutrihelp-api\test\deepDebug.js Line: console.log(` Testing with user_id: ${testUserId}, meal_plan_ids: [${testMealPlanIds.join(', ')}]`);
File: Nutrihelp-api\test\shoppingList.test.js Line: .send({ user_id: 1, meal_plan_ids: [1, 2] });

### Search: database_schema_direct_check
File: Nutrihelp-api\dbConnection.js Line: module.exports = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
File: Nutrihelp-api\database\supabaseClient.js Line: const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
File: Nutrihelp-api\services\supabaseClient.js Line: const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
File: Nutrihelp-api\services\supabaseClient.js Line: const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
File: Nutrihelp-api\database\ingredient-allergy-trigger.sql Line: CREATE TRIGGER trig_recipe_ingredient_allergy
File: Nutrihelp-api\database\ingredient-dislike-trigger.sql Line: CREATE TRIGGER trig_recipe_ingredient_dislike
File: Nutrihelp-api\database\recipe-allergy-trigger.sql Line: CREATE TRIGGER trig_recipe_allergy
File: Nutrihelp-api\database\recipe-dislike-trigger.sql Line: CREATE TRIGGER trig_recipe_dislike
File: Nutrihelp-api\database\ingredient-allergy-trigger.sql Line: ON recipe_ingredient
File: Nutrihelp-api\database\ingredient-dislike-trigger.sql Line: ON recipe_ingredient
File: Nutrihelp-api\database\recipe-allergy-trigger.sql Line: ON recipe_ingredient
File: Nutrihelp-api\database\recipe-dislike-trigger.sql Line: ON recipe_ingredient
File: Nutrihelp-api\(folder scan) Line: migrations/ folder not found in Nutrihelp-api

### Search: database_schema_tables_referenced_in_code
File: Nutrihelp-api\model\getMealPlanByUserIdAndDate.js Line: supabase.from('meal_plan').select('created_at, recipes, meal_type')
File: Nutrihelp-api\model\mealPlan.js Line: .from('meal_plan')
File: Nutrihelp-api\model\mealPlan.js Line: .from("recipe_meal")
File: Nutrihelp-api\model\updateUserPreferences.js Line: .from("user_allergies")
File: Nutrihelp-api\model\updateUserPreferences.js Line: .from("user_health_conditions")
File: Nutrihelp-api\model\fetchAllHealthConditions.js Line: .from('health_conditions')
File: Nutrihelp-api\model\healthSurveyModel.js Line: .from("health_surveys")
File: Nutrihelp-api\model\healthPlanModel.js Line: .from("health_plan")
File: Nutrihelp-api\model\healthPlanModel.js Line: .from("health_plan_weekly")
File: Nutrihelp-api\model\healthRiskReportModel.js Line: .from("health_risk_reports")
File: Nutrihelp-api\model\chatbotHistory.js Line: .from('chat_history')
File: Nutrihelp-api\controller\shoppingListController.js Line: .from('shopping_lists')
File: Nutrihelp-api\controller\shoppingListController.js Line: .from('shopping_list_items')
File: Nutrihelp-api\controller\shoppingListController.js Line: .from('ingredient_price')
File: Nutrihelp-api\controller\healthNewsController.js Line: .from('health_news')
File: Nutrihelp-api\model\getHealthArticles.js Line: .from('health_articles')
File: Nutrihelp-api\model\getBarcodeAllergen.js Line: .from("recipe_ingredient")
File: Nutrihelp-api\model\getBarcodeAllergen.js Line: .from("ingredients")
File: Nutrihelp-api\model\getUserProfile.js Line: .from("users")
File: Nutrihelp-api\services\securityEvents\securityEventsService.js Line: supabase.from('auth_logs').select('*')
File: Nutrihelp-api\services\securityEvents\securityEventsService.js Line: supabase.from('brute_force_logs').select('*')
File: Nutrihelp-api\services\securityEvents\securityEventsService.js Line: supabase.from('user_session').select('*')

### Search: supabase_dashboard_table_editor_links
File: Nutrihelp-web\src\supabaseClient.js Line: const supabaseUrl = 'https://djqanfaqkwuxgcchoyuf.supabase.co';
File: Nutrihelp-web\src\utils\supabase.js Line: const supabaseUrl = 'https://mdauzoueyzgtqsojttkp.supabase.co'
File: Supabase Dashboard Line: https://app.supabase.com
File: Supabase Table Editor Line: https://app.supabase.com/project/djqanfaqkwuxgcchoyuf/editor
File: Supabase Table Editor Line: https://app.supabase.com/project/mdauzoueyzgtqsojttkp/editor

### Search: risk_hotspots
File: Nutrihelp-web\src\routes\Login\Login.jsx Line: localStorage.setItem("auth_token", token)
File: Nutrihelp-web\src\routes\Login\Login.jsx Line: localStorage.setItem("user_session", JSON.stringify(userSession))
File: Nutrihelp-web\src\routes\UI-Only-Pages\UserProfilePage\userprofile.jsx Line: const token = localStorage.getItem("jwt_token")
File: Nutrihelp-web\src\routes\UI-Only-Pages\UserProfilePage\userprofile.jsx Line: const res = await fetch("http://localhost:80/api/profile", {
File: Nutrihelp-api\routes\index.js Line: app.use("/api/userprofile", require('./userprofile'));
File: Nutrihelp-web\src\routes\UI-Only-Pages\DietaryRequirements\DietaryRequirements.jsx Line: fetch('http://localhost:80/api/userPreference', {
File: Nutrihelp-api\routes\index.js Line: app.use("/api/user/preferences", require('./userPreferences'));
File: Nutrihelp-web\src\supabaseClient.js Line: const supabaseKey = '...';      // Replace this
File: Nutrihelp-web\src\utils\supabase.js Line: const supabaseAnonKey = '...'
File: Nutrihelp-web\src\routes\survey\ObesityPredictor.jsx Line: fetch('http://localhost:8000/ai-model/medical-report/retrieve', {
File: Nutrihelp-web\src\routes\survey\FitnessRoadmap.jsx Line: fetch('http://localhost:8000/ai-model/medical-report/plan/generate', {
File: Nutrihelp-api\controller\chatbotController.js Line: const ai_response = await fetch("http://localhost:8000/ai-model/chatbot/chat", {
File: Nutrihelp-api\routes\index.js Line: app.use('/api/chatbot', require('./chatbot'));
File: Nutrihelp-api\routes\index.js Line: app.use('/api/chatbot', require('./chatbot'));

### Search: transmission_points_backend_select_insert_update
File: Nutrihelp-api\controller\authController.js Line: .from('users')
File: Nutrihelp-api\controller\authController.js Line: .select(`
File: Nutrihelp-api\controller\authController.js Line: const { error } = await supabase.from('auth_logs').insert([
File: Nutrihelp-api\model\getUserProfile.js Line: .from("users")
File: Nutrihelp-api\model\getUserProfile.js Line: .select("user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id")
File: Nutrihelp-api\model\updateUserProfile.js Line: .from("users")
File: Nutrihelp-api\model\updateUserProfile.js Line: .update(attributes)
File: Nutrihelp-api\model\updateUserProfile.js Line: .from("images")
File: Nutrihelp-api\model\updateUserProfile.js Line: .insert(test)
File: Nutrihelp-api\model\updateUserProfile.js Line: .from("users")
File: Nutrihelp-api\model\updateUserProfile.js Line: .update({ image_id: image_data[0].id })
File: Nutrihelp-api\model\updateUserPreferences.js Line: .from("user_allergies")
File: Nutrihelp-api\model\updateUserPreferences.js Line: .insert(body.allergies.map((id) => ({user_id: userId, allergy_id: id})));
File: Nutrihelp-api\model\updateUserPreferences.js Line: .from("user_health_conditions")
File: Nutrihelp-api\model\updateUserPreferences.js Line: .insert(body.health_conditions.map((id) => ({user_id: userId, health_condition_id: id})));
File: Nutrihelp-api\model\fetchUserPreferences.js Line: .select('...allergy_id(id, name)')
File: Nutrihelp-api\model\fetchUserPreferences.js Line: .select('...health_condition_id(id, name)')
File: Nutrihelp-api\model\mealPlan.js Line: .from('meal_plan')
File: Nutrihelp-api\model\mealPlan.js Line: .insert({ user_id: userId, recipes: recipe_json, meal_type: meal_type })
File: Nutrihelp-api\model\mealPlan.js Line: .select()
File: Nutrihelp-api\model\mealPlan.js Line: .from("recipe_meal")
File: Nutrihelp-api\model\mealPlan.js Line: .insert(insert_object)
File: Nutrihelp-api\model\mealPlan.js Line: .select('...mealplan_id(id,meal_type),recipe_id,...recipe_id(' + query + ')')
File: Nutrihelp-api\model\getMealPlanByUserIdAndDate.js Line: let query = supabase.from('meal_plan').select('created_at, recipes, meal_type');
File: Nutrihelp-api\controller\shoppingListController.js Line: .from('recipe_meal')
File: Nutrihelp-api\controller\shoppingListController.js Line: .select(`
File: Nutrihelp-api\controller\shoppingListController.js Line: .in('mealplan_id', meal_plan_ids)
File: Nutrihelp-api\controller\shoppingListController.js Line: .eq('user_id', user_id);
File: Nutrihelp-api\controller\shoppingListController.js Line: .from('ingredient_price')
File: Nutrihelp-api\controller\shoppingListController.js Line: .select('price, package_size, unit, measurement')
File: Nutrihelp-api\model\healthSurveyModel.js Line: .from("health_surveys")
File: Nutrihelp-api\model\healthSurveyModel.js Line: .insert(survey)
File: Nutrihelp-api\model\healthPlanModel.js Line: .from("health_plan")
File: Nutrihelp-api\model\healthPlanModel.js Line: .insert(plan)
File: Nutrihelp-api\model\healthRiskReportModel.js Line: .from("health_risk_reports")
File: Nutrihelp-api\model\healthRiskReportModel.js Line: .insert(report)
File: Nutrihelp-api\model\chatbotHistory.js Line: .from('chat_history')
File: Nutrihelp-api\model\chatbotHistory.js Line: .insert([{ user_id, user_input, chatbot_response, timestamp: new Date().toISOString() }]);
File: Nutrihelp-api\model\chatbotHistory.js Line: .select('*')

### Search: transmission_points_frontend_api_supabase
File: Nutrihelp-web\src\routes\Login\Login.jsx Line: const res = await fetch(`${API_BASE}/api/login`, {
File: Nutrihelp-web\src\routes\MFA\MFAform.jsx Line: const resp = await fetch("http://localhost:80/api/login/mfa", {
File: Nutrihelp-web\src\routes\MFA\MFAform.jsx Line: const resp = await fetch("http://localhost:80/api/login/resend-mfa", {
File: Nutrihelp-web\src\routes\UI-Only-Pages\UserProfilePage\userprofile.jsx Line: const res = await fetch("http://localhost:80/api/profile", {
File: Nutrihelp-web\src\routes\UI-Only-Pages\UserProfilePage\userprofile.jsx Line: const profile = Array.isArray(data) ? data[0] : data
File: Nutrihelp-web\src\routes\UI-Only-Pages\UserProfilePage\userprofile.jsx Line: goals: profile.goals ? [profile.goals] : [],
File: Nutrihelp-web\src\routes\UI-Only-Pages\DietaryRequirements\DietaryRequirements.jsx Line: fetch('http://localhost:80/api/userPreference', {
File: Nutrihelp-web\src\routes\UI-Only-Pages\DietaryRequirements\DietaryRequirements.jsx Line: const preferencedata = { specialDietaryRequirements, allergies, dislikes, healthConditions, cuisine, spiceLevel, cookingMethod }
File: Nutrihelp-web\src\routes\Account\Account.js Line: const response = await fetch(`http://localhost:80/api/account?${params.toString()}`);
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: import { supabase } from '../../supabaseClient';
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: .from('weeklyrecipes').select('*').ilike('meal_type', meal).eq('is_published', true);
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: .from('weekly_recipe_ingredient').select('*').in('recipe_id', Array.from(recipeIdSet));
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: const target = GOAL_TARGETS[filters?.goal || 'Maintenance'];
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: const selectedAllergies = filters?.allergies || [];
File: Nutrihelp-web\src\routes\ScanBarcode\ScanBarcode.jsx Line: const response = await fetch(`http://localhost:80/api/barcode?code=${barcodeInput}`, {
File: Nutrihelp-web\src\routes\ScanBarcode\ScanBarcode.jsx Line: setMatchingAllergens(data.detection_result.matchingAllergens);
File: Nutrihelp-web\src\routes\ScanBarcode\ScanBarcode.jsx Line: setUserAllergen(data.user_allergen_ingredients);
File: Nutrihelp-web\src\routes\survey\ObesityPredictor.jsx Line: const response = await fetch('http://localhost:8000/ai-model/medical-report/retrieve', {
File: Nutrihelp-web\src\routes\survey\FitnessRoadmap.jsx Line: fetch('http://localhost:8000/ai-model/medical-report/plan/generate', {

### Search: transmission_flow_login_to_profile_to_mealplan_to_ai
File: Nutrihelp-web\src\routes\Login\Login.jsx Line: fetch(`${API_BASE}/api/login`, { body: JSON.stringify({ email, password }) })
File: Nutrihelp-api\routes\index.js Line: app.use("/api/login", require('./login'));
File: Nutrihelp-api\routes\auth.js Line: router.post('/login', authController.login);
File: Nutrihelp-api\controller\authController.js Line: .from('users').select(`user_id, email, name, ...`)
File: Nutrihelp-web\src\routes\UI-Only-Pages\UserProfilePage\userprofile.jsx Line: fetch("http://localhost:80/api/profile", { method: "GET", headers: { Authorization: `Bearer ...` } })
File: Nutrihelp-api\routes\index.js Line: app.use("/api/userprofile", require('./userprofile'));
File: Nutrihelp-api\controller\userProfileController.js Line: const userProfile = await getUser(targetEmail);
File: Nutrihelp-api\model\getUserProfile.js Line: .from("users").select("user_id,name,first_name,last_name,email,...")
File: Nutrihelp-web\src\routes\Account\Account.js Line: fetch(`http://localhost:80/api/account?${params.toString()}`)
File: Nutrihelp-api\controller\accountController.js Line: const mealPlans = await getMealPlanByUserIdAndDate(user_id, created_at);
File: Nutrihelp-api\model\getMealPlanByUserIdAndDate.js Line: supabase.from('meal_plan').select('created_at, recipes, meal_type').eq('user_id', user_id)
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: supabase.from('weeklyrecipes').select('*')
File: Nutrihelp-web\src\routes\Meal\WeeklyMealUtils.js Line: supabase.from('weekly_recipe_ingredient').select('*')
File: Nutrihelp-api\controller\shoppingListController.js Line: .from('recipe_meal').select(...).in('mealplan_id', meal_plan_ids).eq('user_id', user_id)
File: Nutrihelp-api\routes\index.js Line: app.use('/api/chatbot', require('./chatbot'));
File: Nutrihelp-api\routes\chatbot.js Line: router.route('/query').post(chatbotController.getChatResponse);
File: Nutrihelp-api\controller\chatbotController.js Line: fetch("http://localhost:8000/ai-model/chatbot/chat", { body: JSON.stringify({ query: user_input }) })
File: Nutrihelp-api\controller\chatbotController.js Line: await addHistory(user_id, user_input, responseText);
File: Nutrihelp-web\src\routes\survey\ObesityPredictor.jsx Line: fetch('http://localhost:8000/ai-model/medical-report/retrieve', { body: JSON.stringify(payload) })
File: Nutrihelp-api\routes\medicalPrediction.js Line: router.route('/plan').post(healthPlanController.generateWeeklyPlan);
File: Nutrihelp-api\controller\healthPlanController.js Line: const aiResponse = await fetch(`${AI_BASE}/plan/generate`, { body: JSON.stringify(payload) });
File: Nutrihelp-api\test\testFixedAPI.js Line: meal_plan_ids: [21, 22], // Using actual meal plan IDs from your database
File: Nutrihelp-api\test\testShoppingListAPI.js Line: meal_plan_ids: [1, 2],
File: Nutrihelp-api\validators\shoppingListValidator.js Line: body('meal_plan_ids')
File: Nutrihelp-web\src\routes\Meal\PDFExport.js Line: filename: 'Weekly_Meal_Plan.pdf',
File: Nutrihelp-web\src\routes\Meal\WeeklyMealPlanPage.jsx Line: pdf.save('Weekly_Meal_Plan.pdf');

### Search: health
File: Nutrihelp-api\index.yaml Line: /fooddata/healthconditions:
File: Nutrihelp-api\index.yaml Line: summary: Get health conditions
File: Nutrihelp-api\index.yaml Line: description: Retrieves a list of health conditions
File: Nutrihelp-api\index.yaml Line: description: List of health conditions
File: Nutrihelp-api\index.yaml Line: health_conditions:
File: Nutrihelp-api\index.yaml Line: health_conditions: [ ]
File: Nutrihelp-api\index.yaml Line: health_conditions:
File: Nutrihelp-api\index.yaml Line: health_conditions: [ ]
File: Nutrihelp-api\index.yaml Line: description: Retrieves substitution options for a specific ingredient, with optional filtering by allergies, dietary requirements, and health conditions.
File: Nutrihelp-api\index.yaml Line: - name: healthConditions
File: Nutrihelp-api\index.yaml Line: description: List of health condition IDs to consider for substitutions. Pass as a comma-separated string.
File: Nutrihelp-api\index.yaml Line: /health-news:
File: Nutrihelp-api\index.yaml Line: - "filter" (default): Filter health news articles using flexible criteria
File: Nutrihelp-api\index.yaml Line: - "getById": Get specific health news by ID (requires id parameter)
File: Nutrihelp-api\index.yaml Line: description: Health news ID
File: Nutrihelp-api\index.yaml Line: $ref: '#/components/schemas/HealthNews'
File: Nutrihelp-api\index.yaml Line: - $ref: '#/components/schemas/HealthNews'
File: Nutrihelp-api\index.yaml Line: summary: Unified Health News Creation API
File: Nutrihelp-api\index.yaml Line: description: Create health news articles and related entities
File: Nutrihelp-api\index.yaml Line: - "createNews" (default): Create a new health news article
File: Nutrihelp-api\index.yaml Line: example: "Diet and Health: How to Plan Your Daily Meals"
File: Nutrihelp-api\index.yaml Line: example: "This article explains how to maintain health through proper meal planning"
File: Nutrihelp-api\index.yaml Line: example: "Proper eating habits are essential for health."
File: Nutrihelp-api\index.yaml Line: example: "Diet and Health: How to Plan Your Daily Meals"
File: Nutrihelp-api\index.yaml Line: summary: Update Health News

### Search: symptom
File: Nutrihelp-web\index.html Line: symptom guidance, and daily wellness tracking.
File: Nutrihelp-web\src\App.js Line: import SymptomAssessment from "./routes/SymptomAssessment/SymptomAssessment";
File: Nutrihelp-web\src\App.js Line: <Route path="/symptomassessment" element={<SymptomAssessment />} />
File: Nutrihelp-web\src\components\SideMenu.js Line: <Link to="/symptomassessment" className="mega-item" onClick={close}>
File: Nutrihelp-web\src\components\SideMenu.js Line: Symptom Assessment
File: Nutrihelp-web\src\components\SideMenu.js Line: { type: "link", label: "Symptom Assessment", to: "/symptomassessment" },
File: Nutrihelp-web\src\routes\chat\ChatPage.jsx Line: "Symptom Assessment",
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-assessment-wrapper {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-grid {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-option {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-checkbox {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-chip {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-option:hover .symptom-chip {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-option:focus-within .symptom-chip {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-checkbox:checked + .symptom-chip {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-actions {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-grid {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-chip {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-grid {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.css Line: .symptom-chip {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.jsx Line: import "./SymptomAssessment.css";
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.jsx Line: const symptomsList = [
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.jsx Line: const deficiencyToSymptoms = {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.jsx Line: export default function SymptomAssessmentPage() {
File: Nutrihelp-web\src\routes\SymptomAssessment\SymptomAssessment.jsx Line: const [selectedSymptoms, setSelectedSymptoms] = useState([]);

### Search: nutrient
File: Nutrihelp-api\index.yaml Line: description: Create a new nutrition help service.
File: Nutrihelp-api\index.yaml Line: description: Update an existing nutrition help service by ID.
File: Nutrihelp-api\index.yaml Line: description: Delete a nutrition help service by ID.
File: Nutrihelp-api\index.yaml Line: description: Admin or nutritionist can update notification status
File: Nutrihelp-api\index.yaml Line: example: "Nutrition"
File: Nutrihelp-api\index.yaml Line: example: "Articles about food nutrition"
File: Nutrihelp-api\index.yaml Line: example: "Nutrition expert with 20 years of experience"
File: Nutrihelp-api\index.yaml Line: /recipe/nutritionlog:
File: Nutrihelp-api\index.yaml Line: summary: Get full nutrition info for a recipe by name
File: Nutrihelp-api\index.yaml Line: description: Returns nutritional values of a recipe based on recipe_name
File: Nutrihelp-api\index.yaml Line: description: Nutritional info returned successfully
File: Nutrihelp-api\index.yaml Line: example: "Nutrition"
File: Nutrihelp-api\index.yaml Line: example: "Nutrition expert with 20 years of experience"
File: Nutrihelp-api\index.yaml Line: example: "Nutrition"
File: Nutrihelp-api\index.yaml Line: example: "Articles about food nutrition"
File: Nutrihelp-api\controller\recipeNutritionController.js Line: exports.getRecipeNutritionByName = async (req, res) => {
File: Nutrihelp-api\routes\index.js Line: app.use('/api/recipe/nutritionlog', require('./recipeNutritionlog'));
File: Nutrihelp-api\routes\mealplan.js Line: // Route to add a meal plan (Nutritionist + Admin)
File: Nutrihelp-api\routes\mealplan.js Line: authorizeRoles("nutritionist", "admin"),
File: Nutrihelp-api\routes\mealplan.js Line: // Route to get a meal plan (User + Nutritionist + Admin)
File: Nutrihelp-api\routes\mealplan.js Line: authorizeRoles("user", "nutritionist", "admin"),
File: Nutrihelp-api\routes\notifications.js Line: // Update notification status by ID → Admin or Nutritionist
File: Nutrihelp-api\routes\notifications.js Line: authorizeRoles('admin', 'nutritionist'),
File: Nutrihelp-api\routes\recipeNutritionlog.js Line: const { getRecipeNutritionByName } = require('../controller/recipeNutritionController');
File: Nutrihelp-api\routes\recipeNutritionlog.js Line: * /api/recipe/nutrition:

### Search: user_id + any of the above
File: Nutrihelp-api\controller\healthPlanController.js Line: // return res.status(400).json({ error: "Missing user_id for saving health plan" });
File: Nutrihelp-api\controller\mealplanController.js Line: let meal_plan = await add(user_id, { recipe_ids: recipe_ids }, meal_type);
File: Nutrihelp-api\controller\mealplanController.js Line: await saveMealRelation(user_id, recipe_ids, meal_plan[0].id);
File: Nutrihelp-api\controller\mealplanController.js Line: let meal_plans = await get(user_id);
File: Nutrihelp-api\controller\shoppingListController.js Line: const { user_id, meal_plan_ids, meal_types } = req.body;
File: Nutrihelp-api\controller\shoppingListController.js Line: if (!user_id || !meal_plan_ids || !Array.isArray(meal_plan_ids)) {
File: Nutrihelp-api\controller\userProfileController.js Line: const url = await saveImage(req.body.user_image, userProfile[0].user_id);
File: Nutrihelp-api\database\ingredient-allergy-trigger.sql Line: WHERE t1.user_id = t2.user_id AND t1.ingredient_id = t2.allergy_id;
File: Nutrihelp-api\database\recipe-allergy-trigger.sql Line: WHERE t1.user_id = t2.user_id AND t1.id = t2.recipe_id AND t2.allergy = TRUE;
File: Nutrihelp-api\model\getBarcodeAllergen.js Line: async function getSavedUserAllergies(user_id) {
File: Nutrihelp-api\model\getBarcodeAllergen.js Line: const user_allergen_result = await getSavedUserAllergies(user_id);
File: Nutrihelp-api\model\getUserPassword.js Line: async function getUserProfile(user_id) {
File: Nutrihelp-api\model\updateUserPreferences.js Line: .insert(body.allergies.map((id) => ({user_id: userId, allergy_id: id})));
File: Nutrihelp-api\model\updateUserPreferences.js Line: .insert(body.health_conditions.map((id) => ({user_id: userId, health_condition_id: id})));
File: Nutrihelp-api\technical_docs\data-classification-table.md Line: | database/ingredient-allergy-trigger.sql | user_id, allergy_id, ingredient_id | Health Data | **Sensitive** | **Links user health data and allergy information.** | Encrypt data at rest and in transit; implement RLS; restrict access to authorized roles; use token-based authentication and strong password hashing. |
File: Nutrihelp-api\technical_docs\data-classification-table.md Line: | database/recipe-allergy-trigger.sql | user_id, recipe_id, allergy | Health Data | **Sensitive** | **Contains medical-related triggers for user recipes.** | Encrypt data at rest and in transit; implement RLS; restrict access to authorized roles; use token-based authentication and strong password hashing. |
File: Nutrihelp-api\technical_docs\data-classification-table.md Line: | controllers/userProfileController.js | user_id, profile_info | Personal Data | Confidential | Manages user profile data and updates. | Restrict access based on roles; log and monitor access; avoid storing in plaintext; sanitize output before displaying or logging. |
File: Nutrihelp-api\technical_docs\data-classification-table.md Line: | **models/mealPlan.js** | **mealPlan, user_id, date** | Health Data | **Sensitive** | Stores personalized meal plans. | Encrypt data at rest and in transit; implement RLS; restrict access to authorized roles; use token-based authentication and strong password hashing. |
File: Nutrihelp-api\technical_docs\data-classification-table.md Line: | **models/healthSurveyModel.js** | **survey_answers, user_id** | Health Data | **Sensitive** | Holds health survey responses linked to users. | Encrypt data at rest and in transit; implement RLS; restrict access to authorized roles; use token-based authentication and strong password hashing. |
File: Nutrihelp-api\test\deepDebug.js Line: console.log(` Testing with user_id: ${testUserId}, meal_plan_ids: [${testMealPlanIds.join(', ')}]`);
File: Nutrihelp-api\test\shoppingList.test.js Line: .send({ user_id: 1, meal_plan_ids: [1, 2] });