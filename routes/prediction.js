const express = require('express');
const predictionController = require('../controller/predictionController.js');

const router = express.Router();

// Define route for receiving input data and returning predictions
router.route('/').post(function(req, res){
  // Example: Receive image filename from the client
  const { filename } = req.body;

  // Call the predictImage function from the controller
  predictionController.predictImage(filename, (error, prediction) => {
    if (error) {
      res.status(500).json({ error });
    } else {
      res.json({ prediction });
    }
  });
});

module.exports = router;
