# Feedback-Based Optimization System

This system automatically improves the image classification accuracy based on user feedback. It implements a semi-supervised learning approach where user corrections are collected and periodically analyzed to improve the classification logic.

## Components

The feedback optimization system consists of the following components:

1. **Feedback Collection** (`collect_feedback.js`)
   - Collects user feedback on image classifications
   - Stores the feedback in the Supabase database

2. **Feedback Analysis** (`analyze_feedback.js`)
   - Analyzes collected feedback to identify patterns
   - Provides statistics on commonly misclassified foods

3. **Feedback Optimization** (`apply_feedback_improvements.js`)
   - Automatically applies improvements based on feedback patterns
   - Updates food mappings, keywords, and classification rules

4. **Scheduled Optimization** (`scheduled_optimization.js`)
   - Runs the optimization process on a schedule
   - Creates backups and logs the optimization history

## How It Works

### 1. Collecting Feedback

When the image classification system makes a mistake, users can provide feedback:

```
node tools/feedback/collect_feedback.js uploads/image.jpg "correct_class"
```

This feedback is stored in the Supabase database, linking the image with both the predicted class and the correct class.

### 2. Analyzing Feedback

The system can analyze collected feedback to identify patterns:

```
node tools/feedback/analyze_feedback.js
```

This shows statistics about which classes are frequently confused and suggests potential improvements.

### 3. Applying Improvements

The system can automatically apply improvements based on feedback data:

```
node tools/feedback/apply_feedback_improvements.js [min_count]
```

- `min_count`: Minimum number of occurrences to consider a pattern significant (default: 3)

The improvements include:

- **Mapping Updates**: Correcting food mappings in the Python classification script
- **Keyword Additions**: Adding new keywords extracted from filenames
- **Texture/Color Analysis**: Updating texture and color analysis rules

### 4. Scheduled Optimization

For continuous improvement, the system can run optimizations automatically:

```
node tools/feedback/scheduled_optimization.js
```

This script is designed to be run on a schedule (e.g., daily or weekly) using a task scheduler:

- On Linux/Unix: Use cron jobs
- On Windows: Use Task Scheduler

Example cron job (runs daily at 2 AM):
```
0 2 * * * cd /path/to/Nutrihelp-api && node tools/feedback/scheduled_optimization.js >> logs/cron.log 2>&1
```

## Configuration

Key configuration options are available in each script:

- `MIN_FEEDBACK_COUNT`: Minimum feedback count to trigger an update (default: 3)
- `UPDATE_KEYWORDS`: Whether to update keywords (default: true)
- `UPDATE_MAPPINGS`: Whether to update food mappings (default: true)
- `UPDATE_TEXTURES`: Whether to update texture analysis rules (default: true)
- `BACKUP_BEFORE_UPDATES`: Whether to backup Python file before updates (default: true)

## Logs and Backups

The system maintains logs and backups:

- **Optimization Logs**: `logs/optimization_history.log`
- **Python File Backups**: `backups/recipeImageClassification_[timestamp].py`

## Best Practices

1. **Regular Feedback Collection**: Encourage users to provide feedback when misclassifications occur
2. **Periodic Manual Review**: Occasionally review the automatic optimizations
3. **Threshold Tuning**: Adjust the `MIN_FEEDBACK_COUNT` based on usage volume
4. **Backup Management**: Periodically clean up old backups to save disk space

## Technical Implementation

The system uses a semi-supervised learning approach:

1. **Error Pattern Detection**: Identifying which classes are frequently confused
2. **Keyword Extraction**: Finding words in filenames that correlate with specific classes
3. **Rule-Based Improvements**: Updating classification rules based on feedback patterns

This approach allows for continuous improvement without requiring complex model retraining. 