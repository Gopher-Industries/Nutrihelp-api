//FOR THIS API TO WORK, YOU MUST HAVE THE AI MODEL FILE SAVED TO THE PREDICTION_MODELS FOLDER
//THIS FILE CAN BE FOUND UPLOADED TO THE NUTRIHELP TEAMS SITE
//IT IS CALLED BEST_MODEL_CLASS.HDF5

const express = require('express');
const predictionController = require('../controller/recipeImageClassificationController.js');
const { validateRecipeImageUpload } = require('../validators/recipeImageValidator.js');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

// Define multer configuration for file upload
const upload = multer({ dest: './uploads/' });

// Define route for receiving input data and returning predictions
// Route with middleware and controller
router.post(
  '/',
  upload.single('image'),
  validateRecipeImageUpload,  // 👈 validate image file
  predictionController.predictRecipeImage
);

module.exports = router;