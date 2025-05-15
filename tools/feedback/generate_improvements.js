/**
 * Generate Improvement Suggestions Based on Feedback Data
 * 
 * Analyzes collected feedback data and generates specific code improvement suggestions
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FEEDBACK_DIR = path.join(__dirname, '../../feedback_data');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedback.json');
const PYTHON_FILE = '../../model/recipeImageClassification.py';

// Check if feedback data exists
if (!fs.existsSync(FEEDBACK_FILE)) {
  console.log('No feedback data found. Please collect feedback using collect_feedback.js first.');
  process.exit(0);
}

// Check if Python script exists
if (!fs.existsSync(PYTHON_FILE)) {
  console.log(`Python script not found: ${PYTHON_FILE}`);
  process.exit(1);
}

// Load feedback data
let feedbackData = [];
try {
  const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
  feedbackData = JSON.parse(data);
  console.log(`Loaded ${feedbackData.length} feedback records`);
} catch (err) {
  console.error('Failed to read feedback data:', err);
  process.exit(1);
}

if (feedbackData.length === 0) {
  console.log('Feedback data is empty. Please collect feedback using collect_feedback.js first.');
  process.exit(0);
}

// Load Python script content
let pythonContent = '';
try {
  pythonContent = fs.readFileSync(PYTHON_FILE, 'utf8');
  console.log('Loaded Python script');
} catch (err) {
  console.error('Failed to read Python script:', err);
  process.exit(1);
}

// Analyze feedback data, find most common classes
const classCounts = {};
feedbackData.forEach(feedback => {
  const className = feedback.correct_class.toLowerCase();
  
  if (!classCounts[className]) {
    classCounts[className] = 0;
  }
  
  classCounts[className]++;
});

// Sort classes by count
const sortedClasses = Object.keys(classCounts).sort((a, b) => {
  return classCounts[b] - classCounts[a];
});

// Generate improvement suggestions
console.log('\nImprovement Suggestions Based on Feedback Data:');
console.log('===============================\n');

// 1. Keyword matching suggestions
console.log('1. Keyword Matching Suggestions:');
console.log('------------------');

// Check if there are keywords that need to be added to DISH_OVERRIDES
const suggestedKeywords = {};
sortedClasses.forEach(className => {
  // Generate possible keywords for each class
  const keywords = generateKeywordsForClass(className);
  
  keywords.forEach(keyword => {
    // Check if keyword already exists in Python script
    if (!pythonContent.includes(`"${keyword}": `)) {
      // Determine which existing class this should map to
      const mappedClass = mapToExistingClass(className);
      suggestedKeywords[keyword] = mappedClass;
    }
  });
});

if (Object.keys(suggestedKeywords).length > 0) {
  console.log('Recommended keyword mappings to add:');
  
  let code = 'const newKeywords = {\n';
  for (const [keyword, mappedClass] of Object.entries(suggestedKeywords)) {
    code += `  "${keyword}": "${mappedClass}",  // Corresponding class: ${getOriginalClass(keyword)}\n`;
  }
  code += '};\n';
  
  console.log(code);
  console.log('You can add this code to tools/image_classification/add_keywords.js to use it.');
} else {
  console.log('No new keywords found that need to be added.');
}

// 2. Custom class suggestions
console.log('\n2. Custom Class Suggestions:');
console.log('------------------');

const customClasses = [];
sortedClasses.forEach(className => {
  // Check if it's a custom class (not in original model)
  if (!isInOriginalModel(className, pythonContent)) {
    customClasses.push(className);
  }
});

if (customClasses.length > 0) {
  console.log('The following classes are not in the original model, consider adding to custom_food_types:');
  
  let code = '// In the Python script, find the custom_food_types dictionary and add the following:\n';
  code += 'custom_food_types = {\n';
  customClasses.forEach(className => {
    const mappedClass = mapToExistingClass(className);
    code += `    '${className}': '${mappedClass}',  // Map ${className} to ${mappedClass}\n`;
  });
  code += '    // Keep existing entries\n';
  code += '}\n';
  
  console.log(code);
}

// 3. Color and texture analysis suggestions
console.log('\n3. Color and Texture Analysis Suggestions:');
console.log('------------------------');

// Check if there are special food types that need specific color and texture rules
const specialClasses = customClasses.filter(cls => classCounts[cls] >= 3);

if (specialClasses.length > 0) {
  console.log('The following classes appear frequently, recommend adding specific color and texture rules:');
  
  specialClasses.forEach(className => {
    const { color, texture } = suggestColorAndTexture(className);
    console.log(`\nAdd specific rules for "${className}":`);
    
    let code = '# In the predict_class function, find the "Combine color and texture" section, add the following condition:\n';
    code += `elif dominant_color == '${color}' and texture_type == '${texture}':\n`;
    code += `    # Possible ${className}\n`;
    const mappedClass = mapToExistingClass(className);
    code += `    prediction = '${mappedClass}'\n`;
    code += `    debug_log(f"${color} + ${texture} texture detected: possible ${className}, classified as {prediction}")\n`;
    
    console.log(code);
  });
}

// 4. Filename detection suggestions
console.log('\n4. Add filename detection for these custom classes:');
console.log('------------------');

if (customClasses.length > 0) {
  console.log('Add filename detection for these custom classes:');
  
  let code = '# In the predict_class function, find the special handling section, add the following code:\n';
  customClasses.forEach(className => {
    code += `\n# Special handling for ${className} category\n`;
    code += `if "${className}" in file_name.lower():\n`;
    code += `    debug_log(f"Detected ${className} in filename: {file_name}")\n`;
    const mappedClass = mapToExistingClass(className);
    code += `    return "${mappedClass}"  # Return best match for ${className}\n`;
  });
  
  console.log(code);
}

// 5. Summary suggestions
console.log('\n5. Summary Suggestions:');
console.log('--------------');
console.log('Based on feedback data, we recommend the following actions to improve recognition accuracy:');
console.log('1. Add more keyword mappings, especially for common custom classes');
console.log('2. For high-frequency classes, add specialized color and texture analysis rules');
console.log('3. Enhance filename detection, especially for commonly confused classes');
console.log('4. Continue collecting more feedback data, especially for classes with high error rates');

if (sortedClasses.length > 0) {
  console.log('\nClasses to focus on:');
  const topClasses = sortedClasses.slice(0, Math.min(3, sortedClasses.length));
  topClasses.forEach(className => {
    console.log(`- ${className} (${classCounts[className]} feedback entries)`);
  });
}

// Helper functions

// Generate possible keywords for a class
function generateKeywordsForClass(className) {
  const keywords = [className];
  
  // Add variants
  if (className.length > 3) {
    // Add truncated variant
    keywords.push(className.substring(0, Math.ceil(className.length * 0.7)));
  }
  
  // Add common variants for specific classes
  if (className === 'sushi') {
    keywords.push('sushi_variant1', 'sushi_variant2', 'sushi_variant3', 'sushi_variant4');
  } else if (className === 'pizza') {
    keywords.push('pizza_alt', 'flatbread', 'pie');
  } else if (className === 'curry') {
    keywords.push('curry_alt', 'spicy_sauce');
  } else if (className === 'noodle' || className === 'noodles') {
    keywords.push('pasta', 'ramen', 'udon');
  } else if (className === 'rice') {
    keywords.push('grain', 'rice_bowl');
  }
  
  return keywords;
}

// Map to existing class
function mapToExistingClass(className) {
  // Map common classes
  const mappings = {
    'sushi': 'mussels',
    'pizza': 'pizza',
    'curry': 'chicken_curry',
    'noodle': 'ramen',
    'noodles': 'ramen',
    'rice': 'fried_rice',
    'hamburger': 'hamburger',
    'pasta': 'spaghetti_bolognese',
    'steak': 'steak',
    'salad': 'greek_salad',
    'soup': 'miso_soup',
    'cake': 'chocolate_cake',
    'ice_cream': 'ice_cream',
    'bread': 'garlic_bread'
  };
  
  if (mappings[className]) {
    return mappings[className];
  }
  
  // No direct mapping, choose appropriate class
  if (className.includes('roll') || className.includes('sushi')) {
    return 'mussels';
  } else if (className.includes('noodle')) {
    return 'ramen';
  } else if (className.includes('rice')) {
    return 'fried_rice';
  } else if (className.includes('salad')) {
    return 'greek_salad';
  } else if (className.includes('soup')) {
    return 'miso_soup';
  } else if (className.includes('cake') || className.includes('dessert')) {
    return 'chocolate_cake';
  } else if (className.includes('meat') || className.includes('beef')) {
    return 'steak';
  } else if (className.includes('chicken')) {
    return 'chicken_wings';
  } else if (className.includes('fish') || className.includes('seafood')) {
    return 'mussels';
  }
  
  // Default to common class
  return 'edamame';
}

// Get original class for keyword
function getOriginalClass(keyword) {
  // Special cases
  if (keyword.includes('sushi_variant1') || keyword.includes('sushi_variant2') || keyword.includes('sushi_variant3')) {
    return 'sushi';
  } else if (keyword.includes('pizza_alt') || keyword.includes('flatbread')) {
    return 'pizza';
  } else if (keyword.includes('curry_alt')) {
    return 'curry';
  } else if (keyword.includes('pasta') || keyword.includes('ramen')) {
    return 'noodles';
  } else if (keyword.includes('grain') || keyword.includes('rice_bowl')) {
    return 'rice';
  }
  
  // Default return keyword itself
  return keyword;
}

// Check if class is in original model
function isInOriginalModel(className, pythonContent) {
  // Check if className is in class_mapping values
  const regex = new RegExp(`'${className}'`, 'i');
  return regex.test(pythonContent);
}

// Suggest color and texture for class
function suggestColorAndTexture(className) {
  // Specific class suggestions
  const suggestions = {
    'sushi': { color: 'white', texture: 'complex' },
    'pizza': { color: 'red', texture: 'complex' },
    'curry': { color: 'orange', texture: 'medium' },
    'noodle': { color: 'beige', texture: 'medium' },
    'noodles': { color: 'beige', texture: 'medium' },
    'rice': { color: 'white', texture: 'medium' },
    'hamburger': { color: 'brown', texture: 'complex' },
    'pasta': { color: 'beige', texture: 'medium' },
    'steak': { color: 'red', texture: 'medium' },
    'salad': { color: 'green', texture: 'complex' },
    'soup': { color: 'dark', texture: 'smooth' },
    'cake': { color: 'brown', texture: 'regular' },
    'ice_cream': { color: 'white', texture: 'smooth' }
  };
  
  if (suggestions[className]) {
    return suggestions[className];
  }
  
  // Default suggestion
  return { color: 'beige', texture: 'medium' };
} 