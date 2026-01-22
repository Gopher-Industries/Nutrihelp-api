const express    = require("express");
const router     = express.Router();
const controller = require("../controller/foodDataController");
const foodDatabase = require("../controller/foodDatabaseController");


router.route("/dietaryrequirements").get(controller.getAllDietaryRequirements);
router.route("/cuisines").get(controller.getAllCuisines);
router.route("/allergies").get(controller.getAllAllergies);
router.route("/ingredients").get(controller.getAllIngredients);
router.route("/cookingmethods").get(controller.getAllCookingMethods);
router.route("/spicelevels").get(controller.getAllSpiceLevels);
router.route("/healthconditions").get(controller.getAllHealthConditions);

router.route("/mealplan").get(foodDatabase.getFoodData);

module.exports = router;