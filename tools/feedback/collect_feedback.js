/**
 * Image Classification Feedback Collection Tool
 * 
 * This tool collects user feedback on image classification results to improve accuracy
 * Usage: node tools/feedback/collect_feedback.js <image_path> <correct_class>
 * 
 * Example: node tools/feedback/collect_feedback.js ./uploads/sushi.jpg "sushi"
 */

// Ensure environment variables are loaded first
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const addImageClassificationFeedback = require('../../model/addImageClassificationFeedback');

// Check Supabase credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials in environment variables.');
  console.error('Please make sure your .env file contains SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Configuration
const IMAGE_PATH = process.argv[2];
const CORRECT_CLASS = process.argv[3];

// Show help
if (!IMAGE_PATH || !CORRECT_CLASS) {
  console.log('Usage: node tools/feedback/collect_feedback.js <image_path> <correct_class>');
  console.log('Example: node tools/feedback/collect_feedback.js ./uploads/sushi.jpg "sushi"');
  process.exit(1);
}

// Check if image exists
if (!fs.existsSync(IMAGE_PATH)) {
  console.error(`Error: Image does not exist: ${IMAGE_PATH}`);
  process.exit(1);
}

// Get predicted class from file if it exists
let predictedClass = 'unknown';
const predictionFile = path.join(path.dirname(IMAGE_PATH), 'last_prediction.txt');

if (fs.existsSync(predictionFile)) {
  try {
    predictedClass = fs.readFileSync(predictionFile, 'utf8').trim();
  } catch (err) {
    console.error('Failed to read prediction file:', err);
  }
}

// Collect metadata for analysis
const metadata = {
  timestamp: Date.now(),
  filename: path.basename(IMAGE_PATH),
  filesize: fs.statSync(IMAGE_PATH).size,
  source: 'feedback_tool'
};

// Send feedback to Supabase
(async () => {
  try {
    console.log('Submitting feedback to database...');
    console.log(`Using Supabase URL: ${process.env.SUPABASE_URL.substring(0, 15)}...`);
    
    // User ID is null here as this is a command-line tool
    // In a web application, you would include the actual user ID
    const result = await addImageClassificationFeedback(
      null,
      IMAGE_PATH, 
      predictedClass, 
      CORRECT_CLASS,
      metadata
    );
    
    console.log('Feedback submitted successfully!');
    console.log(`Image: ${path.basename(IMAGE_PATH)}`);
    console.log(`Predicted as: ${predictedClass}`);
    console.log(`Corrected to: ${CORRECT_CLASS}`);
    
    // Explain next steps
    console.log('\nYour feedback will help improve the recognition accuracy');
    console.log('\nYou can analyze collected feedback using:');
    console.log('1. Check all collected feedback: node tools/feedback/analyze_feedback.js');
    console.log('2. Analyze feedback for specific class: node tools/feedback/analyze_feedback.js <class_name>');
    console.log('   Example: node tools/feedback/analyze_feedback.js sushi');
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    
    // More detailed error handling
    if (error.message && error.message.includes('supabaseUrl is required')) {
      console.error('\nSUPABASE_URL environment variable is not being loaded properly.');
      console.error('Current environment variables:');
      console.error(`SUPABASE_URL: ${process.env.SUPABASE_URL || 'not set'}`);
      console.error(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'set (hidden)' : 'not set'}`);
    } else if (error.message && error.message.includes('auth/invalid_credentials')) {
      console.error('\nInvalid Supabase credentials. Please check your SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
    
    process.exit(1);
  }
})(); 