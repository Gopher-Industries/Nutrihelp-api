/**
 * Scheduled Feedback-Based Optimization
 * 
 * This script is designed to be run on a schedule (e.g., daily or weekly)
 * to automatically apply optimizations to the image classification system
 * based on user feedback data.
 * 
 * Usage: node tools/feedback/scheduled_optimization.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const LOG_FILE = path.join(__dirname, '../../logs/optimization_history.log');
const MIN_FEEDBACK_THRESHOLD = 3; // Minimum feedback count to trigger optimizations
const BACKUP_BEFORE_UPDATES = true; // Whether to backup Python file before updates

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Log message to console and log file
 * @param {string} message - Message to log
 */
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  console.log(logEntry);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry + '\n');
}

/**
 * Create backup of Python classification file
 */
function backupClassificationFile() {
  if (!BACKUP_BEFORE_UPDATES) return;
  
  const pythonFile = path.join(__dirname, '../../model/recipeImageClassification.py');
  const backupDir = path.join(__dirname, '../../backups');
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create backup with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `recipeImageClassification_${timestamp}.py`);
  
  try {
    fs.copyFileSync(pythonFile, backupFile);
    logMessage(`Created backup: ${backupFile}`);
    return true;
  } catch (error) {
    logMessage(`Error creating backup: ${error.message}`);
    return false;
  }
}

/**
 * Run the feedback-based optimization script
 */
function runOptimization() {
  try {
    logMessage('Starting scheduled optimization...');
    
    // Backup classification file
    backupClassificationFile();
    
    // Run feedback analysis first to see if optimization is needed
    logMessage('Running feedback analysis...');
    const analyzeCommand = 'node tools/feedback/analyze_feedback.js';
    
    try {
      const analysisOutput = execSync(analyzeCommand, { encoding: 'utf8' });
      
      // Log abbreviated analysis output
      const analysisLines = analysisOutput.split('\n').slice(0, 20);
      if (analysisOutput.split('\n').length > 20) {
        analysisLines.push('...');
      }
      logMessage('Analysis output:\n' + analysisLines.join('\n'));
      
      // Check if we have enough feedback data to proceed
      if (analysisOutput.includes('No feedback data found')) {
        logMessage('Insufficient feedback data. Optimization skipped.');
        return;
      }
    } catch (error) {
      logMessage(`Error running analysis: ${error.message}`);
      return;
    }
    
    // Run the optimization with the threshold
    logMessage(`Running optimization with threshold ${MIN_FEEDBACK_THRESHOLD}...`);
    const optimizeCommand = `node tools/feedback/apply_feedback_improvements.js ${MIN_FEEDBACK_THRESHOLD}`;
    
    try {
      const optimizationOutput = execSync(optimizeCommand, { encoding: 'utf8' });
      
      // Log abbreviated optimization output
      const outputLines = optimizationOutput.split('\n').slice(0, 30);
      if (optimizationOutput.split('\n').length > 30) {
        outputLines.push('...');
      }
      logMessage('Optimization output:\n' + outputLines.join('\n'));
      
      // Check if any improvements were made
      if (optimizationOutput.includes('Optimization complete')) {
        // Run a test after optimization
        logMessage('Running test to verify optimization...');
        const testImages = fs.readdirSync(path.join(__dirname, '../../uploads'))
          .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        
        if (testImages.length > 0) {
          // Test with a random image
          const testImage = testImages[Math.floor(Math.random() * testImages.length)];
          const testCommand = `node tools/test/test_image_classification.js uploads/${testImage}`;
          
          try {
            const testOutput = execSync(testCommand, { encoding: 'utf8' });
            logMessage(`Test result for ${testImage}:\n${testOutput.split('\n').slice(-5).join('\n')}`);
          } catch (error) {
            logMessage(`Error running test: ${error.message}`);
          }
        }
      } else {
        logMessage('No improvements were made.');
      }
    } catch (error) {
      logMessage(`Error running optimization: ${error.message}`);
    }
    
    logMessage('Scheduled optimization completed.');
  } catch (error) {
    logMessage(`Unexpected error: ${error.message}`);
  }
}

// Run the main function
runOptimization(); 