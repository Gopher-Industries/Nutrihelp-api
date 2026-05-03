// This route currently delegates to a Python heuristic classifier.
// It does not load a trained ML model yet, so the response includes
// metadata describing the heuristic decision source and any warnings.

const fs = require("fs");
const path = require("path");
const { executePythonScript } = require("../services/aiExecutionService");
const { ok, fail } = require('../utils/apiResponse');
const {
    buildImageScanPayload,
    SCAN_CONTRACT_VERSION,
} = require('../services/scanContractService');

const unlinkAsync = fs.promises.unlink;

const predictRecipeImage = async (req, res) => {
    try {
        if (!req.file || !req.file.path) {
            return fail(res, 'No image uploaded', 400, 'IMAGE_MISSING');
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
            return fail(res, 'Invalid file type. Only JPG/PNG files are allowed.', 400, 'IMAGE_INVALID_TYPE');
        }
        
        const scriptPath = path.join(__dirname, '..', 'model', 'recipeImageClassification.py');

        if (!fs.existsSync(scriptPath)) {
            console.error(`Python script not found at ${scriptPath}`);
            await cleanupFiles(imagePath);
            return fail(res, 'Recipe classification script not found', 500, 'SCAN_SERVICE_MISCONFIGURED');
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

            return fail(
                res,
                result.error || 'Internal server error during image classification',
                statusCode,
                result.timedOut ? 'SCAN_TIMEOUT' : 'SCAN_FAILED'
            );
        }

        const classification = {
            label: result.prediction || null,
            rawLabel: result.prediction || null,
            calories: null,
            confidence: typeof result.confidence === 'number' ? result.confidence : null,
            uncertain: typeof result.confidence === 'number' ? result.confidence < 0.6 : !result.prediction,
            source: result.metadata?.source || 'recipe-image-script',
            fallbackUsed: false,
            alternatives: Array.isArray(result.metadata?.alternatives) ? result.metadata.alternatives : [],
        };

        const explainability = {
            service: 'recipe_image_classification',
            source: classification.source,
            fallbackUsed: false,
            timedOut: false,
            circuitOpen: false,
            durationMs: typeof result.metadata?.durationMs === 'number' ? result.metadata.durationMs : 0,
            confidence: classification.confidence,
            confidenceThreshold: 0.6,
            warnings: Array.isArray(result.warnings) ? result.warnings : [],
        };

        return ok(
            res,
            buildImageScanPayload({
                type: 'image',
                entity: 'recipe',
                query: { uploadField: 'image' },
                item: { imageName: originalName || null },
                classification,
                explainability,
            }),
            200,
            { contractVersion: SCAN_CONTRACT_VERSION }
        );
    } catch (error) {
        console.error("Unexpected error in predictRecipeImage:", error);
        if (!res.headersSent) {
            fail(res, 'Unexpected error during image processing', 500, 'SCAN_FAILED');
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
