const express = require('express');
const predictionController = require('../controller/recipeImageClassificationController.js');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

// Define multer configuration for file upload
const upload = multer({ dest: './uploads/' });

// Define route for receiving input data and returning predictions
router.post('/', upload.single('image'), (req, res) => {
  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // Call the predictImage function from the controller with req and res objects
  predictionController.predictRecipeImage(req, res);
});

module.exports = router;