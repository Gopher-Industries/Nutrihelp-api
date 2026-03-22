const fs = require('fs');
const path = require('path');
const { executePythonScript } = require('../services/aiExecutionService');

// Utility to delete the uploaded file
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
    }
  });
};

// Function to handle prediction logic
const predictImage = async (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({
      success: false,
      prediction: null,
      confidence: null,
      error: 'No image uploaded. Please upload a JPEG or PNG image.'
    });
  }

  // Path to the uploaded image file
  const imagePath = req.file.path;

  if (!imagePath) {
    return res.status(400).json({
      success: false,
      prediction: null,
      confidence: null,
      error: 'Image path is missing.'
    });
  }

  try {
    const imageData = await fs.promises.readFile(imagePath);
    const result = await executePythonScript({
      scriptPath: path.join(__dirname, '..', 'model', 'imageClassification.py'),
      stdin: imageData
    });

    if (!result.success) {
      const statusCode = result.timedOut ? 504 : 500;
      return res.status(statusCode).json({
        success: false,
        prediction: null,
        confidence: null,
        error: result.error || 'Model execution failed.'
      });
    }

    return res.status(200).json({
      success: true,
      prediction: result.prediction,
      confidence: result.confidence,
      error: null
    });
  } catch (error) {
    console.error('Error reading image file:', error);
    return res.status(500).json({
      success: false,
      prediction: null,
      confidence: null,
      error: 'Internal server error'
    });
  } finally {
    deleteFile(imagePath);
  }
};

module.exports = {
  predictImage
};
