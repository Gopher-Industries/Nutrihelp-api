const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Utility to delete the uploaded file
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
    }
  });
};

// Function to clean the raw prediction output
const cleanPrediction = (prediction) => {
  const lines = prediction.split('\n');
  const lastLine = lines[lines.length - 2]; // Skip the last empty line
  const startIndex = lastLine.indexOf(' ') + 1;
  return lastLine.slice(startIndex).trim();
};

// Function to handle prediction logic
const predictImage = (req, res) => {
  // Path to the uploaded image file
  const imagePath = req.file.path;

  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is missing.' });
  }

  // Read the image file from disk
  fs.readFile(imagePath, (err, imageData) => {
    if (err) {
      console.error('Error reading image file:', err);
      deleteFile(imagePath);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Execute Python script using child_process.spawn
    const pythonProcess = spawn('python', ['model/imageClassification.py']);

    // Pass image data to Python script via stdin
    pythonProcess.stdin.write(imageData);
    pythonProcess.stdin.end();

    // Collect data from Python script output
    let prediction = '';
    pythonProcess.stdout.on('data', (data) => {
      prediction += data.toString();
    });

    // Handle errors
    pythonProcess.stderr.on('data', (data) => {
      console.error('Error executing Python script:', data.toString());
      deleteFile(imagePath);
      res.status(500).json({ error: 'Internal server error' });
    });

    // When Python script finishes execution
    pythonProcess.on('close', (code) => {
      deleteFile(imagePath);

      if (code !== 0) {
        console.error('Python script exited with code:', code);
        return res.status(500).json({ error: 'Model execution failed.' });
      }       
      try{
        const cleanedPrediction = cleanPrediction(prediction);
        res.status(200).json({ prediction: cleanedPrediction });
      } catch (e) {
        console.error('Python script exited with code:', code);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
};

module.exports = {
  predictImage
};
