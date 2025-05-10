# Image Classification Utilities

This directory contains utility tools for the Nutrihelp image classification API.

## Directory Structure

- **image_classification/** - Tools for managing the image classification model
- **feedback/** - Tools for collecting and analyzing user feedback
- **test/** - Tools for testing the image classification system
- **database/** - Tools for testing and managing database connections

## Available Tools

### Image Classification Tools

- **add_keywords.js** - Adds new food keyword mappings to the classification system
  ```
  node tools/image_classification/add_keywords.js
  ```

- **fix_model.py** - Creates a model for testing based on color recognition
  ```
  python tools/image_classification/fix_model.py
  ```

### Feedback Collection Tools

- **collect_feedback.js** - Collects user feedback on incorrect classifications
  ```
  node tools/feedback/collect_feedback.js <image_path> <correct_class>
  ```

- **analyze_feedback.js** - Analyzes collected feedback to identify patterns
  ```
  node tools/feedback/analyze_feedback.js [class_name]
  ```

- **generate_improvements.js** - Generates code improvement suggestions based on feedback
  ```
  node tools/feedback/generate_improvements.js
  ```

### Testing Tools

- **test_image_classification.js** - Tests the image classification on specific images
  ```
  node tools/test/test_image_classification.js <image_path>
  ```

- **add_test_image.js** - Adds a test image to the uploads directory
  ```
  node tools/test/add_test_image.js <source_image_path> <food_name>
  ```

### Database Tools

- **testSupabase.js** - Tests Supabase connection and basic CRUD operations
  ```
  node tools/database/testSupabase.js
  ```

### Utility Tools

- **cleanup_uploads.js** - Cleans up temporary and system-generated files in the uploads directory
  ```
  node tools/cleanup_uploads.js
  ```

## Database Integration

The feedback system uses Supabase for storing user feedback. To set up the database:

1. Run the SQL script in `setup/create_feedback_table.sql` in your Supabase SQL editor
2. Ensure your `.env` file contains the correct Supabase connection details

See `setup/README_FEEDBACK.md` for detailed instructions on setting up and using the feedback system. 