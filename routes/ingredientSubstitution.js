const express = require("express");
const router = express.Router();
const controller = require("../controller/ingredientSubstitutionController");

// Route to get substitution options for a specific ingredient
router.route("/ingredient/:ingredientId").get(controller.getIngredientSubstitutions);

module.exports = router;