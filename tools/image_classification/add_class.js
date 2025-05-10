/**
 * Add Class to Classification Model
 * 
 * Adds a new class to the class_mapping in recipeImageClassification.py
 * Usage: node tools/image_classification/add_class.js <class_name>
 * 
 * Example: node tools/image_classification/add_class.js sushi
 */

const fs = require('fs');
const path = require('path');

// Arguments
const CLASS_NAME = process.argv[2]; // Class name to add

// Show help if no class name provided
if (!CLASS_NAME) {
  console.log('Usage: node tools/image_classification/add_class.js <class_name>');
  console.log('Example: node tools/image_classification/add_class.js sushi');
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
  
  // Find class_mapping dictionary
  const classMappingRegex = /class_mapping = \{[^}]*\}/s;
  const classMappingMatch = content.match(classMappingRegex);
  
  if (!classMappingMatch) {
    console.error('Could not find class_mapping dictionary in Python file');
    process.exit(1);
  }
  
  const classMappingDict = classMappingMatch[0];
  
  // Check if the class already exists in the mapping
  const classRegex = new RegExp(`['"]\\d+['"]:\\s*['"]${CLASS_NAME}['"]`, 'i');
  
  if (classMappingDict.match(classRegex)) {
    console.log(`Class '${CLASS_NAME}' already exists in class_mapping`);
    process.exit(0);
  }
  
  // Find the highest class index
  const indexRegex = /(\d+):/g;
  let match;
  let highestIndex = -1;
  
  while ((match = indexRegex.exec(classMappingDict)) !== null) {
    const index = parseInt(match[1], 10);
    if (index > highestIndex) {
      highestIndex = index;
    }
  }
  
  const newIndex = highestIndex + 1;
  console.log(`Adding new class '${CLASS_NAME}' with index ${newIndex}`);
  
  // Add the new class to the mapping
  const insertPoint = classMappingDict.lastIndexOf('}');
  const newClassMappingDict = 
    classMappingDict.substring(0, insertPoint) + 
    `    ${newIndex}: '${CLASS_NAME}'\n` + 
    classMappingDict.substring(insertPoint);
  
  // Replace the dictionary in the file
  const newContent = content.replace(classMappingDict, newClassMappingDict);
  
  // Now, check if we need to add the class to food_categories
  const updateFoodCategories = () => {
    // Common food category mappings
    const categoryMappings = {
      'sushi': 'japanese',
      'ramen': 'japanese',
      'pizza': 'italian',
      'pasta': 'italian',
      'burger': 'american',
      'hamburger': 'american',
      'salad': 'salad',
      'curry': 'indian',
      'rice': 'asian',
      'cake': 'dessert',
      'ice_cream': 'dessert'
    };
    
    let category = 'other';
    
    // Determine appropriate category
    for (const [key, value] of Object.entries(categoryMappings)) {
      if (CLASS_NAME.includes(key)) {
        category = value;
        break;
      }
    }
    
    // Find food_categories dictionary
    const foodCategoriesRegex = /food_categories = \{[^}]*\}/s;
    const foodCategoriesMatch = newContent.match(foodCategoriesRegex);
    
    if (!foodCategoriesMatch) {
      console.log('Could not find food_categories dictionary');
      return newContent;
    }
    
    const foodCategoriesDict = foodCategoriesMatch[0];
    
    // Check if the category exists
    const categoryRegex = new RegExp(`['"]${category}['"]:\\s*\\[[^\\]]*\\]`);
    const categoryMatch = foodCategoriesDict.match(categoryRegex);
    
    if (!categoryMatch) {
      console.log(`Category '${category}' not found in food_categories`);
      return newContent;
    }
    
    // Check if the class is already in the category list
    const classInCategoryRegex = new RegExp(`['"]${CLASS_NAME}['"]`);
    if (categoryMatch[0].match(classInCategoryRegex)) {
      console.log(`Class '${CLASS_NAME}' already exists in category '${category}'`);
      return newContent;
    }
    
    // Add the class to the category list
    const categoryList = categoryMatch[0];
    const listEndIndex = categoryList.lastIndexOf(']');
    
    let newCategoryList;
    if (categoryList.substring(0, listEndIndex).trim().endsWith(',')) {
      // List already has a trailing comma
      newCategoryList = 
        categoryList.substring(0, listEndIndex) + 
        ` '${CLASS_NAME}'` + 
        categoryList.substring(listEndIndex);
    } else {
      // No trailing comma, need to add one
      const listStartIndex = categoryList.indexOf('[') + 1;
      if (listStartIndex === listEndIndex) {
        // Empty list
        newCategoryList = 
          categoryList.substring(0, listStartIndex) + 
          `'${CLASS_NAME}'` + 
          categoryList.substring(listEndIndex);
      } else {
        // Non-empty list, add with comma
        newCategoryList = 
          categoryList.substring(0, listEndIndex) + 
          `, '${CLASS_NAME}'` + 
          categoryList.substring(listEndIndex);
      }
    }
    
    console.log(`Adding '${CLASS_NAME}' to '${category}' category`);
    return newContent.replace(categoryList, newCategoryList);
  };
  
  // Update food_categories
  const finalContent = updateFoodCategories();
  
  // Write back to file
  fs.writeFileSync(PYTHON_FILE, finalContent);
  console.log(`\nSuccessfully added '${CLASS_NAME}' to class_mapping!`);
  
  // Next steps
  console.log('\nNext steps:');
  console.log('1. Test the classification:');
  console.log(`   node tools/test/test_image_classification.js ./uploads/${CLASS_NAME}.jpg`);
  console.log('2. Update keyword mappings:');
  console.log(`   node tools/image_classification/update_food_mapping.js ${CLASS_NAME} ${CLASS_NAME}`);
  
} catch (err) {
  console.error('Error adding class:', err);
  process.exit(1);
} 