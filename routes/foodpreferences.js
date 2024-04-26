const express    = require("express");
const router     = express.Router();
const controller = require("../controller/foodPreferencesController");


router.route("/dietaryrequirements").get(controller.getAllDietaryRequirements);
router.route("/cuisines").get(controller.getAllCuisines);
router.route("/allergies").get(controller.getAllAllergies);
router.route("/foodtypes").get(controller.getAllFoodTypes);
router.route("/cookingmethods").get(controller.getAllCookingMethods);
router.route("/spicelevels").get(controller.getAllSpiceLevels);

module.exports = router;