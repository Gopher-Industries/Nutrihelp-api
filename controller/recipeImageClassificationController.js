//FOR THIS API TO WORK, YOU MUST HAVE THE AI MODEL FILE SAVED TO THE PREDICTION_MODELS FOLDER
//THIS FILE CAN BE FOUND UPLOADED TO THE NUTRIHELP TEAMS SITE
// IT IS CALLED BEST_MODEL_CLASS.HDF5

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path")

// Function to handle prediction logic
const predictRecipeImage = (req, res) => {
    
    if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Path to the uploaded image file
    const imagePath = req.file.path;
    const newImageName = "uploads/image.jpg";

    // Validate file type
    const fileExtension = path.extname(req.file.originalname)
    const allowedExtensions = [".jpg", ".jpeg", ".png"];

    if (!allowedExtensions.includes(fileExtension)) {
        // Delete the uploaded file if it doesn't meet requirements
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting invalid file:", err);
        });

        return res.status(400).json({ error: "Invalid file type. Only JPG/PNG files are allowed." });
    }
    

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
