const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Function to handle prediction logic
const predictImage = (filename, callback) => {
  // Construct full path to the image file
  const imagePath = path.join(__dirname, '..', 'images', filename);
  //console.log('Image Path:', imagePath);

  // Read the image file from disk
  fs.readFile(imagePath, (err, imageData) => {
    if (err) {
      console.error('Error reading image file:', err);
      return callback('Internal server error', null);
    }

    // Execute Python script using child_process.spawn
    const pythonProcess = spawn('python', ['model/prediction.py']);

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
      callback('Internal server error', null);
    });

    // When Python script finishes execution
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Send prediction back to the callback function
        callback(null, prediction);
      } else {
        console.error('Python script exited with code:', code);
        callback('Internal server error', null);
      }
    });
  });
};

module.exports = {
  predictImage
};
