const { spawn } = require("child_process");
const fs = require("fs");

// Function to handle prediction logic
const predictRecipeImage = (req, res) => {
    // Path to the uploaded image file
    const imagePath = req.file.path;
    const newImageName = "uploads/image.jpg";

    // Read the image file from disk
    fs.readFile(imagePath, (err, imageData) => {
        if (err) {
            console.error("Error reading image file:", err);
            return res.status(500).json({ error: "Internal server error" });
        }

        // Rename the image file
        fs.rename(imagePath, newImageName, (err) => {
            if (err) {
                console.error("Error renaming image:", err);
                return res.status(500).json({ error: "Internal server error" });
            }
        });
    });

    const scriptPath = './model/recipeImageClassification.py'
    const pythonProcess = spawn('python', [scriptPath], { encoding: 'utf-8' } );

    let output = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
    
    pythonProcess.on("close", (code) => {
        if (code === 0) {
            // Clean the output
            const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

            // Split the cleaned output into lines and get the last line
            const lines = cleanOutput.split('\r\n').filter(line => line.trim() !== '');
            const result = lines[lines.length - 1].trim();

            // Send prediction back to the client
            res.status(200).json({ prediction: result });
        } else {
            console.error("Python script exited with code:", code);
            res.status(500).json({ error: "Internal server error" });
        }
    });
};

module.exports = {
    predictRecipeImage,
};
