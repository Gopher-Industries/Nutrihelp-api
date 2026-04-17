/**
 * Uploads Directory Cleanup Tool
 * 
 * This script cleans up temporary and system-generated files in the uploads directory,
 * preserving properly named image files and necessary system files.
 * 
 * Usage: node tools/cleanup_uploads.js
 */

const fs = require('fs');
const path = require('path');

// Main directory
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Files to preserve
const KEEP_FILES = [
  'original_filename.txt', 
  'image.jpg',
  'last_prediction.txt',
  '.gitkeep'
];

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Main function
async function cleanupUploads() {
  console.log('Starting uploads directory cleanup...');
  
  // Ensure directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('Uploads directory does not exist, nothing to clean up');
    return;
  }
  
  try {
    // Read all files
    const files = fs.readdirSync(UPLOADS_DIR);
    console.log(`Found ${files.length} files`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const file of files) {
      // Skip directories
      const filePath = path.join(UPLOADS_DIR, file);
      if (fs.statSync(filePath).isDirectory()) {
        console.log(`Skipping subdirectory: ${file}`);
        continue;
      }
      
      // Check if file is in the keep list
      if (KEEP_FILES.includes(file)) {
        console.log(`Keeping system file: ${file}`);
        keptCount++;
        continue;
      }
      
      // Check if it's an image file
      const extension = path.extname(file).toLowerCase();
      const isImage = IMAGE_EXTENSIONS.includes(extension);
      
      // Check if filename is a valid image name (not a random hash)
      const isValidName = 
        // Valid image name features: not all hexadecimal characters
        (isImage && !/^[a-f0-9]{20,}$/i.test(path.basename(file, extension))) ||
        // Or contains underscores, hyphens, and letters
        (isImage && /[_\-a-z]/i.test(file));
        
      if (isImage && isValidName) {
        console.log(`Keeping image file: ${file}`);
        keptCount++;
        continue;
      }
      
      // Delete unwanted files
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete file ${file}:`, err);
      }
    }
    
    console.log('\nCleanup complete:');
    console.log(`- Deleted ${deletedCount} temporary/system files`);
    console.log(`- Preserved ${keptCount} valid files`);
    
  } catch (err) {
    console.error('Error occurred during cleanup:', err);
  }
}

// Run cleanup
cleanupUploads().then(() => {
  console.log('\nYou can run "node tools/cleanup_uploads.js" anytime to clean the uploads directory');
}); 