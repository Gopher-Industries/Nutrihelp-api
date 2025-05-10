/**
 * Add Keywords Matching Tool
 * 
 * Adds new keyword mappings to recipeImageClassification.py file
 * Usage: node tools/image_classification/add_keywords.js
 */

const fs = require('fs');
const path = require('path');

// Keywords to add, format: "keyword": "match_result"
// Adding more keyword mappings for sushi and other common Asian foods
const newKeywords = {
  // Sushi related
  "sushi": "sushi",  // Now mapping to proper sushi class
  "sushi_jp": "sushi",   // Japanese writing placeholder
  "sushi_trad": "sushi",   // Traditional Chinese placeholder
  "sushi_hiragana": "sushi",   // Japanese hiragana placeholder
  "sushi_katakana": "sushi",   // Japanese katakana placeholder
  "sushi_alt": "sushi",     // Alternative Japanese writing placeholder
  "sashimi": "sushi", // Sashimi
  "maki": "sushi",   // Rolled sushi
  "nigiri": "sushi", // Hand-pressed sushi
  "temaki": "sushi", // Hand roll
  "uramaki": "sushi", // Inside-out roll
  "chirashi": "sushi", // Scattered sushi
  "california": "sushi", // California roll
  "dragon": "sushi", // Dragon roll
  "philadelphia": "sushi", // Philadelphia roll
  "salmon": "sushi", // Salmon (when likely in sushi context)
  "tuna": "sushi",   // Tuna (when likely in sushi context)
  "unagi": "sushi",  // Eel
  "wasabi": "sushi", // Wasabi (hints at sushi)
  
  // Asian foods
  "noodles_cn": "ramen",    // Noodles (Chinese placeholder)
  "ramen_cn": "ramen",    // Ramen (Chinese placeholder)
  "ramen_jp": "ramen", // Ramen (Japanese placeholder)
  "udon_jp": "ramen",  // Udon placeholder
  "soba_jp": "ramen",    // Soba placeholder
  "rice_cn": "fried_rice", // Rice (Chinese placeholder)
  "rice_simple": "fried_rice",   // Rice (simplified placeholder)
  "fried_rice_cn": "fried_rice", // Fried rice placeholder
  "fried_rice_jp": "fried_rice", // Fried rice (Japanese placeholder)
  
  // Western foods
  "pasta_cn": "spaghetti_bolognese", // Pasta (Chinese placeholder)
  "pasta_jp": "spaghetti_bolognese",  // Pasta (Japanese placeholder)
  "macaroni_cn": "macaroni_cheese",      // Macaroni (Chinese placeholder)
  "pizza_cn": "pizza",                  // Pizza (Chinese placeholder)
  "flatbread_cn": "pizza",                  // Alternative term for pizza
  "pizza_jp": "pizza",                  // Pizza (Japanese placeholder)
  "hamburger_cn": "hamburger",              // Hamburger (Chinese placeholder)
  "hamburger_jp": "hamburger",       // Hamburger (Japanese placeholder)
  
  // Common foods
  "curry_cn": "chicken_curry",          // Curry (Chinese placeholder)
  "curry_jp": "chicken_curry",        // Curry (Japanese placeholder)
  "salad_cn": "greek_salad",            // Salad (Chinese placeholder)
  "salad_jp": "greek_salad",          // Salad (Japanese placeholder)
  "cake_cn": "chocolate_cake",         // Cake (Chinese placeholder)
  "cake_jp": "chocolate_cake",       // Cake (Japanese placeholder)
  "ice_cream_cn": "ice_cream",            // Ice cream (Chinese placeholder)
  "ice_cream_jp": "ice_cream"             // Ice cream (Japanese placeholder)
};

// Read Python file
const pythonFile = '../../model/recipeImageClassification.py';

try {
  console.log('Reading Python file...');
  const content = fs.readFileSync(pythonFile, 'utf8');
  
  // Find DISH_OVERRIDES dictionary
  const dictRegex = /DISH_OVERRIDES = \{[^}]*\}/s;
  const dictMatch = content.match(dictRegex);
  
  if (dictMatch) {
    // Extract current dictionary content
    let dictContent = dictMatch[0];
    
    console.log('Found DISH_OVERRIDES dictionary, preparing to add new keywords...');
    
    // Add new keywords at the end of the dictionary (after the last item)
    const insertPoint = dictContent.lastIndexOf('}');
    let newDictContent = dictContent.substring(0, insertPoint);
    
    // Check if keywords already exist
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const [keyword, result] of Object.entries(newKeywords)) {
      if (!content.includes(`"${keyword}": `)) {
        newDictContent += `    "${keyword}": "${result}",\n`;
        addedCount++;
      } else {
        console.log(`Skipping existing keyword: "${keyword}"`);
        skippedCount++;
      }
    }
    
    // Close dictionary
    newDictContent += '}';
    
    // Replace original dictionary in file
    const newContent = content.replace(dictRegex, newDictContent);
    
    // Write back to file
    fs.writeFileSync(pythonFile, newContent);
    console.log(`Successfully added ${addedCount} new keyword mappings!`);
    
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} existing keywords.`);
    }
  } else {
    console.error('Could not find DISH_OVERRIDES dictionary in Python file');
  }
} catch (err) {
  console.error('Error occurred:', err);
} 