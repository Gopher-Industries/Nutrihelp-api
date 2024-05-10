const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Function to handle prediction logic
const predictImage = (req, res) => {
  // Path to the uploaded image file
  const imagePath = req.file.path;

  // Read the image file from disk
  fs.readFile(imagePath, (err, imageData) => {
    if (err) {
      console.error('Error reading image file:', err);
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
      res.status(500).json({ error: 'Internal server error' });
    });

    // When Python script finishes execution
    pythonProcess.on('close', (code) => {
      if (code === 0) {

        //OUTPUT CLEANING
        //-----------------------------------------------------
        function cleanPrediction(prediction) {
          // Split the prediction string by line breaks
          const lines = prediction.split('\n');
          
          // Extract the relevant prediction from the last line
          const lastLine = lines[lines.length - 2]; // Skip the last empty line
          
          // Extract the food name and calorie information
          const startIndex = lastLine.indexOf(' ') + 1; // Start index after the first space
          const predictionText = lastLine.slice(startIndex); // Extract text after the space
          
          // Return the cleaned prediction
          return predictionText.trim(); // Trim any leading/trailing whitespace
        }
        
        // Example usage:
        //const prediction = "\r\n1/1 [==============================] - ETA: 0s\r\n1/1 [==============================] - 0s 332ms/step\r\n14 Avocado:~160 calories per 100 grams\r\n";
        
        //console.log(cleanedPrediction); // Output: "Avocado:~160 calories per 100 grams"
        const cleanedPrediction = cleanPrediction(prediction);
        //-------------------------------------------------------
        // Send prediction back to the client
        res.status(200).json({ prediction: cleanedPrediction });
      } else {
        console.error('Python script exited with code:', code);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
};

module.exports = {
  predictImage
};
