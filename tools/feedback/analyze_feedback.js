/**
 * Image Classification Feedback Analysis Tool
 * 
 * Analyzes collected image classification feedback data to help improve recognition accuracy
 * Usage: node tools/feedback/analyze_feedback.js [class_name]
 * 
 * If no class name is provided, all collected feedback will be analyzed
 */

// Ensure environment variables are loaded first
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const supabase = require('../../dbConnection.js');

// Check Supabase credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials in environment variables.');
  console.error('Please make sure your .env file contains SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Configuration
const TARGET_CLASS = process.argv[2]; // Optional parameter for specific class

console.log(`Using Supabase URL: ${process.env.SUPABASE_URL.substring(0, 15)}...`);

// Main function to analyze feedback
async function analyzeFeedback() {
  try {
    console.log('Loading feedback data from database...');
    
    // Query the feedback data from Supabase
    let query = supabase
      .from('image_classification_feedback')
      .select('*')
      .order('created_at', { ascending: false });
      
    // Filter by target class if specified
    if (TARGET_CLASS) {
      query = query.eq('correct_class', TARGET_CLASS.toLowerCase());
    }
    
    // Execute the query
    const { data: feedbackData, error } = await query;
    
    if (error) {
      console.error('Error retrieving feedback data:', error);
      
      if (error.message && error.message.includes('does not exist')) {
        console.error('\nTable "image_classification_feedback" does not exist in your Supabase database.');
        console.error('Please run the SQL script in setup/create_feedback_table.sql in your Supabase SQL Editor.');
      }
      
      process.exit(1);
    }
    
    if (!feedbackData || feedbackData.length === 0) {
      console.log('No feedback data found. Please collect feedback using tools/feedback/collect_feedback.js first.');
      process.exit(0);
    }
    
    console.log(`Loaded ${feedbackData.length} feedback records`);
    
    // Generate statistics
    const classCounts = {};
    const classImages = {};
    let totalFeedback = feedbackData.length;
    
    feedbackData.forEach(feedback => {
      const className = feedback.correct_class.toLowerCase();
      
      // Count
      if (!classCounts[className]) {
        classCounts[className] = 0;
        classImages[className] = [];
      }
      
      classCounts[className]++;
      classImages[className].push(feedback.filename);
    });
    
    // Sort classes by count
    const sortedClasses = Object.keys(classCounts).sort((a, b) => {
      return classCounts[b] - classCounts[a];
    });
    
    // Print analysis results
    console.log('\nFeedback Analysis Results:');
    console.log('-------------------------');
    
    if (TARGET_CLASS) {
      if (classCounts[TARGET_CLASS.toLowerCase()]) {
        console.log(`Class "${TARGET_CLASS}" feedback statistics:`);
        console.log(`- Sample count: ${classCounts[TARGET_CLASS.toLowerCase()]}`);
        console.log('- Sample filenames:');
        classImages[TARGET_CLASS.toLowerCase()].forEach(filename => {
          console.log(`  - ${filename}`);
        });
      } else {
        console.log(`No feedback data found for class "${TARGET_CLASS}"`);
      }
    } else {
      console.log(`Total: ${totalFeedback} feedback entries`);
      console.log('\nBy class:');
      
      sortedClasses.forEach(className => {
        const percentage = ((classCounts[className] / totalFeedback) * 100).toFixed(2);
        console.log(`- ${className}: ${classCounts[className]} entries (${percentage}%)`);
      });
    }
    
    // Provide improvement suggestions
    console.log('\nImprovement Suggestions:');
    if (sortedClasses.length > 3) {
      // Get the top three most common classes
      const topClasses = sortedClasses.slice(0, 3);
      console.log('1. Focus on these classes:');
      topClasses.forEach(className => {
        console.log(`   - ${className} (${classCounts[className]} feedback entries)`);
      });
    }
    
    console.log('2. Methods to improve recognition accuracy:');
    console.log('   - Use tools/image_classification/add_keywords.js to add more keywords for specific classes');
    console.log('   - Modify color and texture analysis rules in recipeImageClassification.py');
    console.log('   - Consider collecting more samples, especially for classes with high error rates');
    
    // Explain next steps
    console.log('\nYou can test image classification with this command:');
    console.log('node tools/test/test_image_classification.js <image_path>');

    // Help with adding keywords
    console.log('\nTo add more keyword mappings for classes, use the add_keywords.js script:');
    console.log('node tools/image_classification/add_keywords.js');

    // Generate improvements script suggestion
    console.log('\nGenerate improvement suggestions using collected feedback:');
    console.log('node tools/feedback/generate_improvements.js');
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    
    // More detailed error handling
    if (error.message && error.message.includes('supabaseUrl is required')) {
      console.error('\nSUPABASE_URL environment variable is not being loaded properly.');
      console.error('Current environment variables:');
      console.error(`SUPABASE_URL: ${process.env.SUPABASE_URL || 'not set'}`);
      console.error(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'set (hidden)' : 'not set'}`);
    }
    
    process.exit(1);
  }
}

// Run the analysis
analyzeFeedback(); 