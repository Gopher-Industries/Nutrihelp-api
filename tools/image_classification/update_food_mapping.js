/**
 * Update Food Mapping Tool
 * 
 * Updates the food mapping in recipeImageClassification.py file
 * Usage: node tools/image_classification/update_food_mapping.js <food_name> <class_name>
 * 
 * Example: node tools/image_classification/update_food_mapping.js sushi sushi
 */

const fs = require('fs');
const path = require('path');

// Arguments
const FOOD_NAME = process.argv[2]; // Food name to update
const CLASS_NAME = process.argv[3]; // New class mapping

// Show help
if (!FOOD_NAME || !CLASS_NAME) {
  console.log('Usage: node tools/image_classification/update_food_mapping.js <food_name> <class_name>');
  console.log('Example: node tools/image_classification/update_food_mapping.js sushi sushi');
  process.exit(1);
}

// Path to Python classification file
const PYTHON_FILE = path.join(__dirname, '../../model/recipeImageClassification.py');

// Check if file exists
if (!fs.existsSync(PYTHON_FILE)) {
  console.error(`Error: Python file not found: ${PYTHON_FILE}`);
  process.exit(1);
}

// Read the Python file
try {
  console.log(`Reading Python file: ${PYTHON_FILE}`);
  let content = fs.readFileSync(PYTHON_FILE, 'utf8');
  
  // Update in custom_food_types
  const customFoodRegex = /custom_food_types = \{[^}]*\}/s;
  const customFoodMatch = content.match(customFoodRegex);
  
  if (!customFoodMatch) {
    console.error('Could not find custom_food_types dictionary in Python file');
    process.exit(1);
  }
  
  const customFoodDict = customFoodMatch[0];
  
  // Check if the food name exists in the custom_food_types dictionary
  const foodRegex = new RegExp(`['"]${FOOD_NAME}['"]:\\s*['"]([^'"]+)['"]`, 'i');
  const foodMatch = customFoodDict.match(foodRegex);
  
  if (foodMatch) {
    console.log(`Found mapping for '${FOOD_NAME}' in custom_food_types: '${foodMatch[1]}'`);
    console.log(`Updating to '${CLASS_NAME}'...`);
    
    // Update the mapping
    const newCustomFoodDict = customFoodDict.replace(
      foodRegex,
      `'${FOOD_NAME}': '${CLASS_NAME}'`
    );
    
    // Replace the dictionary in the file
    content = content.replace(customFoodDict, newCustomFoodDict);
  } else {
    console.log(`No existing mapping found for '${FOOD_NAME}' in custom_food_types`);
    
    // Add new mapping at the end of the dictionary
    const insertPoint = customFoodDict.lastIndexOf('}');
    const newCustomFoodDict = 
      customFoodDict.substring(0, insertPoint) + 
      `    '${FOOD_NAME}': '${CLASS_NAME}',\n` + 
      customFoodDict.substring(insertPoint);
    
    // Replace the dictionary in the file
    content = content.replace(customFoodDict, newCustomFoodDict);
  }
  
  // Update special handling for sushi in filename detection
  if (FOOD_NAME === 'sushi') {
    // Find and update filename detection block
    const filenameHandlingRegex = /# Special handling for sushi\s+if "sushi" in file_name\.lower\(\):[^}]+return "([^"]+)"/s;
    const filenameMatch = content.match(filenameHandlingRegex);
    
    if (filenameMatch) {
      console.log(`Found special handling for sushi in filename detection: '${filenameMatch[1]}'`);
      console.log(`Updating to '${CLASS_NAME}'...`);
      
      content = content.replace(
        filenameHandlingRegex,
        `# Special handling for sushi\n    if "sushi" in file_name.lower():\n        debug_log(f"Detected sushi in filename: {file_name}")\n        return "${CLASS_NAME}"`
      );
    }
    
    // Find and update original_filename detection block
    const originalFilenameHandlingRegex = /# Special handling for sushi\s+if "sushi" in original_filename\.lower\(\):[^}]+return "([^"]+)"/s;
    const originalFilenameMatch = content.match(originalFilenameHandlingRegex);
    
    if (originalFilenameMatch) {
      console.log(`Found special handling for sushi in original_filename detection: '${originalFilenameMatch[1]}'`);
      console.log(`Updating to '${CLASS_NAME}'...`);
      
      content = content.replace(
        originalFilenameHandlingRegex,
        `# Special handling for sushi\n    if "sushi" in original_filename.lower():\n        debug_log(f"Detected sushi in original filename: {original_filename}")\n        return "${CLASS_NAME}"`
      );
    }
    
    // Find and update texture detection block for sushi
    const textureHandlingRegex = /# Add white\+complex texture classification \(possibly sushi\)[^}]+prediction = '([^']+)'  # Best substitute for sushi/s;
    const textureMatch = content.match(textureHandlingRegex);
    
    if (textureMatch) {
      console.log(`Found white+complex texture classification for sushi: '${textureMatch[1]}'`);
      console.log(`Updating to '${CLASS_NAME}'...`);
      
      content = content.replace(
        /prediction = '[^']+'  # Best substitute for sushi/,
        `prediction = '${CLASS_NAME}'  # Best substitute for sushi`
      );
    }
  }
  
  // Write back to file
  fs.writeFileSync(PYTHON_FILE, content);
  console.log(`\nSuccessfully updated mapping for '${FOOD_NAME}' to '${CLASS_NAME}'!`);
  console.log('\nYou can now test the classification with:');
  console.log(`node tools/test/test_image_classification.js ./uploads/${FOOD_NAME}.jpg`);
  
} catch (err) {
  console.error('Error updating food mapping:', err);
  process.exit(1);
} 