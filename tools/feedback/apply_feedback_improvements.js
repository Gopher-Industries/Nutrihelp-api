/**
 * Automatic Feedback-Based Improvement System
 * 
 * This script analyzes collected feedback data and automatically applies
 * improvements to the food classification system based on common error patterns.
 * 
 * Usage: node tools/feedback/apply_feedback_improvements.js [min_count]
 * 
 * - min_count: Minimum number of occurrences to consider a pattern significant (default: 3)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const MIN_FEEDBACK_COUNT = parseInt(process.argv[2]) || 3; // Minimum feedback count to trigger an update
const UPDATE_KEYWORDS = true; // Whether to update keywords
const UPDATE_MAPPINGS = true; // Whether to update food mappings
const UPDATE_TEXTURES = true; // Whether to update texture analysis rules

// Create Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Check Supabase credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials in environment variables.');
  console.error('Please make sure your .env file contains SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

/**
 * Analyze feedback data and extract error patterns
 * @returns {Object} Analysis of error patterns and recommendations
 */
async function analyzeFeedbackData() {
  try {
    console.log('Loading feedback data from database...');
    
    // Query all feedback data
    const { data: feedbackData, error } = await supabase
      .from('image_classification_feedback')
      .select('*');
    
    if (error) {
      console.error('Error retrieving feedback data:', error);
      process.exit(1);
    }
    
    if (!feedbackData || feedbackData.length === 0) {
      console.log('No feedback data found. Please collect feedback first.');
      process.exit(0);
    }
    
    console.log(`Analyzing ${feedbackData.length} feedback records...`);
    
    // Identify error patterns
    const errorPatterns = {};
    const correctClassCounts = {};
    const keywordSuggestions = {};
    
    feedbackData.forEach(item => {
      // Skip if prediction was correct
      if (item.predicted_class === item.correct_class) return;
      
      // Record error pattern (wrong -> correct)
      const patternKey = `${item.predicted_class}_to_${item.correct_class}`;
      errorPatterns[patternKey] = (errorPatterns[patternKey] || 0) + 1;
      
      // Record correct class counts
      correctClassCounts[item.correct_class] = (correctClassCounts[item.correct_class] || 0) + 1;
      
      // Extract potential keywords from filenames
      const filename = item.filename.toLowerCase();
      const basename = path.basename(filename, path.extname(filename));
      
      // Only use alphabetic parts as potential keywords (at least 3 chars)
      const words = basename.split(/[^a-z]/i).filter(word => word.length >= 3);
      
      if (!keywordSuggestions[item.correct_class]) {
        keywordSuggestions[item.correct_class] = {};
      }
      
      words.forEach(word => {
        keywordSuggestions[item.correct_class][word] = 
          (keywordSuggestions[item.correct_class][word] || 0) + 1;
      });
    });
    
    // Filter significant error patterns
    const significantPatterns = Object.entries(errorPatterns)
      .filter(([_, count]) => count >= MIN_FEEDBACK_COUNT)
      .sort((a, b) => b[1] - a[1]); // Sort by frequency, highest first
    
    // Filter significant keyword suggestions
    const significantKeywords = {};
    Object.entries(keywordSuggestions).forEach(([className, keywords]) => {
      significantKeywords[className] = Object.entries(keywords)
        .filter(([_, count]) => count >= Math.max(2, Math.floor(MIN_FEEDBACK_COUNT / 2)))
        .map(([keyword, _]) => keyword);
    });
    
    return {
      totalFeedback: feedbackData.length,
      errorPatterns: significantPatterns,
      classCounts: correctClassCounts,
      keywordSuggestions: significantKeywords
    };
  } catch (error) {
    console.error('Error analyzing feedback data:', error);
    process.exit(1);
  }
}

/**
 * Apply food mapping updates based on analysis
 * @param {Array} errorPatterns Significant error patterns
 */
function applyMappingUpdates(errorPatterns) {
  if (!UPDATE_MAPPINGS) return;
  
  console.log('\nApplying food mapping updates...');
  
  errorPatterns.forEach(([pattern, count]) => {
    const [wrong, correct] = pattern.split('_to_');
    
    console.log(`Updating mapping: ${wrong} → ${correct} (${count} occurrences)`);
    
    try {
      // Execute the update_food_mapping.js script
      const command = `node tools/image_classification/update_food_mapping.js ${correct} ${correct}`;
      console.log(`Running: ${command}`);
      
      const output = execSync(command, { encoding: 'utf8' });
      console.log(output);
    } catch (error) {
      console.error(`Error updating mapping for ${correct}:`, error.message);
    }
  });
}

/**
 * Apply keyword updates based on analysis
 * @param {Object} keywordSuggestions Keyword suggestions for each class
 */
function applyKeywordUpdates(keywordSuggestions) {
  if (!UPDATE_KEYWORDS) return;
  
  console.log('\nApplying keyword updates...');
  
  // Create a new keywords object
  const newKeywords = {};
  
  // Populate with suggested keywords
  Object.entries(keywordSuggestions).forEach(([className, keywords]) => {
    keywords.forEach(keyword => {
      if (keyword !== className && !keyword.includes(className)) {
        newKeywords[keyword] = className;
      }
    });
  });
  
  if (Object.keys(newKeywords).length === 0) {
    console.log('No new keywords to add.');
    return;
  }
  
  console.log(`Adding ${Object.keys(newKeywords).length} new keywords:`);
  Object.entries(newKeywords).forEach(([keyword, className]) => {
    console.log(`- "${keyword}" → "${className}"`);
  });
  
  // Path to Python classification file
  const pythonFile = path.join(__dirname, '../../model/recipeImageClassification.py');
  
  try {
    // Read Python file
    const content = fs.readFileSync(pythonFile, 'utf8');
    
    // Find DISH_OVERRIDES dictionary
    const dictRegex = /DISH_OVERRIDES = \{[^}]*\}/s;
    const dictMatch = content.match(dictRegex);
    
    if (!dictMatch) {
      console.error('Could not find DISH_OVERRIDES dictionary in Python file');
      return;
    }
    
    // Extract current dictionary content
    let dictContent = dictMatch[0];
    
    // Add new keywords at the end of the dictionary
    const insertPoint = dictContent.lastIndexOf('}');
    let newDictContent = dictContent.substring(0, insertPoint);
    
    // Check if keywords already exist
    let addedCount = 0;
    
    for (const [keyword, className] of Object.entries(newKeywords)) {
      if (!content.includes(`"${keyword}": `)) {
        newDictContent += `    "${keyword}": "${className}",\n`;
        addedCount++;
      }
    }
    
    // Close dictionary
    newDictContent += '}';
    
    // Only update if new keywords were added
    if (addedCount > 0) {
      // Replace original dictionary in file
      const newContent = content.replace(dictRegex, newDictContent);
      
      // Write back to file
      fs.writeFileSync(pythonFile, newContent);
      console.log(`Successfully added ${addedCount} new keyword mappings!`);
    } else {
      console.log('No new keywords were added (all already exist).');
    }
  } catch (error) {
    console.error('Error updating keywords:', error);
  }
}

/**
 * Apply texture/color analysis updates based on analysis
 * @param {Array} errorPatterns Significant error patterns
 */
function applyTextureUpdates(errorPatterns) {
  if (!UPDATE_TEXTURES) return;
  
  console.log('\nApplying texture/color analysis updates...');
  
  // Path to Python classification file
  const pythonFile = path.join(__dirname, '../../model/recipeImageClassification.py');
  
  try {
    // Read Python file
    const content = fs.readFileSync(pythonFile, 'utf8');
    
    let updatedContent = content;
    let updateCount = 0;
    
    // Look for error patterns that could be texture/color related
    errorPatterns.forEach(([pattern, count]) => {
      const [_, correctClass] = pattern.split('_to_');
      
      // Look for white+complex texture classification section
      if (correctClass === 'sushi') {
        const textureSection = /# Add white\+complex texture classification[\s\S]*?prediction = '[^']+'/;
        const textureMatch = content.match(textureSection);
        
        if (textureMatch) {
          const updatedSection = textureMatch[0].replace(
            /prediction = '[^']+'/,
            `prediction = 'sushi'`
          );
          
          updatedContent = updatedContent.replace(textureMatch[0], updatedSection);
          updateCount++;
        }
      }
      
      // Update color_to_food or food_categories as needed for other classes
      // This would need to be customized based on the specific needs
    });
    
    // Only update if changes were made
    if (updateCount > 0) {
      fs.writeFileSync(pythonFile, updatedContent);
      console.log(`Updated ${updateCount} texture/color analysis rules.`);
    } else {
      console.log('No texture/color analysis rules needed updating.');
    }
  } catch (error) {
    console.error('Error updating texture/color analysis:', error);
  }
}

/**
 * Main function to orchestrate the optimization process
 */
async function optimizeFromFeedback() {
  console.log('Starting feedback-based optimization...');
  console.log(`Minimum occurrence threshold: ${MIN_FEEDBACK_COUNT}`);
  
  const analysis = await analyzeFeedbackData();
  
  console.log(`\nFound ${analysis.totalFeedback} feedback entries`);
  console.log(`Identified ${analysis.errorPatterns.length} significant error patterns:`);
  
  analysis.errorPatterns.forEach(([pattern, count]) => {
    const [wrong, correct] = pattern.split('_to_');
    console.log(`- ${wrong} → ${correct}: ${count} occurrences`);
  });
  
  // Apply updates based on analysis
  applyMappingUpdates(analysis.errorPatterns);
  applyKeywordUpdates(analysis.keywordSuggestions);
  applyTextureUpdates(analysis.errorPatterns);
  
  console.log('\nOptimization complete! The system has been updated based on user feedback.');
  console.log('Run a test to see the improvements:');
  console.log('node tools/test/test_image_classification.js uploads/your_test_image.jpg');
}

// Run the optimization
optimizeFromFeedback(); 