const express = require('express');
const predictionController = require('../controller/imageClassificationController.js');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: 'uploads/', 
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png'].includes(file.mimetype))
});

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // Call the predictImage function from the controller with req and res objects
  predictionController.predictImage(req, res);
  
  // Don't delete the file here, let the controller handle it after processing
  // File deletion logic has been moved to the controller
});

module.exports = router;
