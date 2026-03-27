// This route currently delegates to a Python heuristic classifier.
// It does not load a trained ML model yet, so the response includes
// metadata describing the heuristic decision source and any warnings.

const fs = require("fs");
const path = require("path");
const { executePythonScript } = require("../services/aiExecutionService");

const unlinkAsync = fs.promises.unlink;

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
                console.error("[recipeImageClassificationController] Failed to delete invalid file:", err);
            }
            return res.status(400).json({
                success: false,
                prediction: null,
                confidence: null,
                error: "Invalid file type. Only JPG/PNG files are allowed."
            });
        }
        
        const scriptPath = path.join(__dirname, '..', 'model', 'recipeImageClassification.py');

        if (!fs.existsSync(scriptPath)) {
            console.error(`[recipeImageClassificationController] Python script not found at ${scriptPath}`);
            await cleanupFiles(imagePath);
            return res.status(500).json({
                success: false,
                prediction: null,
                confidence: null,
                error: "Recipe classification script not found"
            });
        }

        const result = await executePythonScript({
            scriptPath,
            args: [imagePath, originalName]
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
            error: null,
            metadata: result.metadata || null,
            warnings: result.warnings || []
        });
    } catch (error) {
        console.error("[recipeImageClassificationController] Prediction failed:", error);
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
        }
    } catch (err) {
        console.error(`[recipeImageClassificationController] Temporary file cleanup failed for ${tempFilePath}:`, err);
    }
}

module.exports = { predictRecipeImage };
