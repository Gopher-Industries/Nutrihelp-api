# Image Classification Feedback System

This system collects and analyzes user feedback on food image classifications to continuously improve the accuracy of the image classification API.

## Setup Instructions

### 1. Create the Supabase Table

1. Log in to your Supabase dashboard.
2. Navigate to the SQL Editor.
3. Copy and paste the contents of `setup/create_feedback_table.sql`.
4. Run the SQL script to create the necessary table and policies.

### 2. Configuration

Make sure your `.env` file contains the Supabase connection details:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Using the Feedback System

### Collecting Feedback via CLI Tool

The command-line tool allows you to submit feedback for incorrectly classified images:

```bash
node collect_feedback.js <image_path> <correct_class>
```

Example:
```bash
node collect_feedback.js ./uploads/sushi.jpg "sushi"
```

### Collecting Feedback in the API

To collect feedback from users in your application, implement this in your API routes:

```javascript
const addImageClassificationFeedback = require('./model/addImageClassificationFeedback');

// Example route handler
app.post('/api/classification-feedback', async (req, res) => {
  try {
    const { user_id, image_path, predicted_class, correct_class, metadata } = req.body;
    
    await addImageClassificationFeedback(
      user_id,
      image_path,
      predicted_class,
      correct_class,
      metadata
    );
    
    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});
```

### Analyzing Collected Feedback

To analyze the feedback data:

```bash
# Analyze all feedback
node analyze_feedback.js

# Analyze feedback for a specific class
node analyze_feedback.js sushi
```

### Generating Improvement Suggestions

Generate code improvement suggestions based on collected feedback:

```bash
node generate_improvements.js
```

## Feedback Data Model

The feedback system stores the following information:

- `id`: Unique identifier for the feedback entry
- `user_id`: ID of the user providing feedback (optional)
- `filename`: Original filename of the image
- `image_data`: Base64 encoded image data (optional)
- `image_type`: MIME type of the image
- `predicted_class`: Class predicted by the system
- `correct_class`: Correct class according to user
- `metadata`: Additional metadata
- `created_at`: When the feedback was submitted

## Benefits

- **Continuous Improvement**: The system helps identify and fix common classification errors.
- **User Engagement**: Allows users to contribute to improving the system.
- **Data Collection**: Builds a dataset that can be used for future model improvements.
- **Performance Monitoring**: Helps track classification accuracy over time.

## Maintenance

- The database is configured to automatically clean up image data older than 90 days to save storage.
- Regularly review the feedback data to identify trends and implement improvements.
- Update the keyword mappings in `add_keywords.js` based on feedback analysis. 