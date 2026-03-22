//FOR THIS API TO WORK, YOU MUST HAVE THE AI MODEL FILE SAVED TO THE PREDICTION_MODELS FOLDER
//THIS FILE CAN BE FOUND UPLOADED TO THE NUTRIHELP TEAMS SITE
// IT IS CALLED BEST_MODEL_CLASS.HDF5

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { executePythonScript } = require("../services/aiExecutionService");

// Convert fs callbacks to promises
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

const predictRecipeImage = async (req, res) => {
    try {
        if (!req.file || !req.file.path) {
            return res.status(400).json({
                success: false,
                prediction: null,
                confidence: null,
                error: "No file uploaded"
            });
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
            return res.status(400).json({
                success: false,
                prediction: null,
                confidence: null,
                error: "Invalid file type. Only JPG/PNG files are allowed."
            });
        }
        
        const originalFilename = originalName.toLowerCase();
        
        try {
            if (!fs.existsSync('uploads')) {
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

        const scriptPath = path.join(__dirname, '..', 'model', 'recipeImageClassification.py');

        if (!fs.existsSync(scriptPath)) {
            console.error(`Python script not found at ${scriptPath}`);
            await cleanupFiles(imagePath);
            return res.status(500).json({
                success: false,
                prediction: null,
                confidence: null,
                error: "Recipe classification script not found"
            });
        }

        const result = await executePythonScript({
            scriptPath
        });

        await cleanupFiles(imagePath);

        if (!result.success) {
            const lowerError = (result.error || '').toLowerCase();
            const statusCode = result.timedOut
                ? 504
                : lowerError.includes('cannot open image file') || lowerError.includes('no file uploaded')
                    ? 400
                    : 500;

            return res.status(statusCode).json({
                success: false,
                prediction: null,
                confidence: null,
                error: result.error || "Internal server error during image classification"
            });
        }

        return res.status(200).json({
            success: true,
            prediction: result.prediction,
            confidence: result.confidence,
            error: null
        });
    } catch (error) {
        console.error("Unexpected error in predictRecipeImage:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                prediction: null,
                confidence: null,
                error: "Unexpected error during image processing"
            });
        }
        if (req.file && req.file.path) {
            await cleanupFiles(req.file.path);
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
