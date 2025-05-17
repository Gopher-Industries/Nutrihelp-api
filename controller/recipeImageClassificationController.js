//FOR THIS API TO WORK, YOU MUST HAVE THE AI MODEL FILE SAVED TO THE PREDICTION_MODELS FOLDER
//THIS FILE CAN BE FOUND UPLOADED TO THE NUTRIHELP TEAMS SITE
// IT IS CALLED BEST_MODEL_CLASS.HDF5

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

// Convert fs callbacks to promises
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

const predictRecipeImage = async (req, res) => {
    try {
        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        
        const imagePath = req.file.path;
        const originalName = req.file.originalname;
        
        const fileExtension = path.extname(originalName).toLowerCase();
        const allowedExtensions = [".jpg", ".jpeg", ".png"];

        if (!allowedExtensions.includes(fileExtension)) {
            try {
                await unlinkAsync(req.file.path);
            } catch (err) {
                console.error("Error deleting invalid file:", err);
            }
            return res.status(400).json({ error: "Invalid file type. Only JPG/PNG files are allowed." });
        }
        
        const originalFilename = originalName.toLowerCase();
        
        try {
            if (!await existsAsync('uploads')) {
                await mkdirAsync('uploads', { recursive: true });
                console.log("Created uploads directory");
            }
        } catch (err) {
            console.error("Error creating uploads directory:", err);
        }

        const namedImagePath = `uploads/${originalFilename}`;
        
        try {
            await fs.promises.copyFile(imagePath, namedImagePath);
            console.log(`Copied temporary file to ${namedImagePath}`);
            
            await writeFileAsync('uploads/original_filename.txt', originalFilename);
        } catch (err) {
            console.error("Error preparing image file:", err);
            // Continue anyway
        }

        return new Promise((resolve, reject) => {
            const scriptPath = './model/recipeImageClassification.py';
            
            if (!fs.existsSync(scriptPath)) {
                console.error(`Python script not found at ${scriptPath}`);
                res.status(500).json({ error: "Recipe classification script not found" });
                cleanupFiles(imagePath);
                return resolve();
            }
            
            console.log(`Running Python script: ${scriptPath}`);
            const pythonProcess = spawn('python', [scriptPath], { encoding: 'utf-8' });

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                const errorText = data.toString();
                errorOutput += errorText;
                
                if (errorText.includes("ERROR:") && 
                    !errorText.includes("successfully") &&
                    !errorText.includes("libpng warning") &&
                    !errorText.includes("Allocating tensor")) {
                    console.error(`Python Error: ${errorText}`);
                }
            });
            
            pythonProcess.on("close", (code) => {
                console.log(`Python process exited with code: ${code}`);
                
                if (code === 0) {
                    try {
                        const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

                        const lines = cleanOutput.split(/\r?\n/).filter(line => line.trim() !== '');
                        const result = lines[lines.length - 1].trim();

                        if (!result) {
                            console.error("Python script returned empty result");
                            res.status(500).json({ error: "Recipe classification returned empty result" });
                        } else {
                            res.status(200).json({ prediction: result });
                        }
                    } catch (error) {
                        console.error("Error processing Python output:", error);
                        res.status(500).json({ error: "Error processing recipe classification result" });
                    }
                } else {
                    if (errorOutput.includes("Model file not found")) {
                        res.status(500).json({ 
                            error: "Recipe classification model not found. Please ensure the AI model is properly installed." 
                        });
                    } else if (errorOutput.includes("No file uploaded") || errorOutput.includes("Cannot open image file")) {
                        res.status(400).json({ error: "Unable to process the uploaded image" });
                    } else {
                        console.error("Python script exited with error code:", code);
                        console.error("Error output:", errorOutput);
                        res.status(500).json({ error: "Internal server error during image classification" });
                    }
                }
                
                cleanupFiles(imagePath);
                resolve();
            });

            pythonProcess.on("error", (err) => {
                console.error("Error running Python script:", err);
                res.status(500).json({ error: "Failed to run image classification process" });
                cleanupFiles(imagePath);
                resolve();
            });
            
            const timeout = setTimeout(() => {
                console.error("Python process timeout - killing process");
                pythonProcess.kill();
                if (!res.headersSent) {
                    res.status(500).json({ error: "Recipe classification timed out" });
                }
                cleanupFiles(imagePath);
                resolve();
            }, 30000); // 30 second timeout
            
            pythonProcess.on('close', () => {
                clearTimeout(timeout);
            });
        });
    } catch (error) {
        console.error("Unexpected error in predictRecipeImage:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Unexpected error during image processing" });
        }
        if (req.file && req.file.path) {
            cleanupFiles(req.file.path);
        }
    }
};

// Helper function to clean up temporary files
async function cleanupFiles(tempFilePath) {
    try {
        // Check if file exists before trying to delete
        if (fs.existsSync(tempFilePath)) {
            await unlinkAsync(tempFilePath);
            console.log(`Cleaned up temporary file: ${tempFilePath}`);
        }
    } catch (err) {
        console.error(`Error cleaning up temporary file ${tempFilePath}:`, err);
    }
}

module.exports = { predictRecipeImage };
