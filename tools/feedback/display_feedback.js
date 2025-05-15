/**
 * Display Image Classification Feedback
 * 
 * This script displays all feedback data from the Supabase database
 * It's a simpler version of analyze_feedback.js that avoids permission issues
 */

// Ensure environment variables are loaded first
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Check Supabase credentials
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials in environment variables.');
  console.error('Please make sure your .env file contains SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create a direct Supabase client to avoid any potential configuration issues
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

console.log(`Using Supabase URL: ${process.env.SUPABASE_URL.substring(0, 15)}...`);

// Display all feedback data
async function displayFeedback() {
  try {
    console.log('Loading feedback data from database...');
    
    // Query the feedback data from Supabase using a direct query
    // that doesn't rely on user permissions at all
    const { data: feedbackData, error } = await supabase
      .from('image_classification_feedback')
      .select('id, filename, predicted_class, correct_class, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error retrieving feedback data:', error);
      
      if (error.message && error.message.includes('does not exist')) {
        console.error('\nTable "image_classification_feedback" does not exist in your Supabase database.');
        console.error('Please run the SQL script in setup/create_feedback_table.sql in your Supabase SQL Editor.');
      } else if (error.message && error.message.includes('permission denied')) {
        console.error('\nPermission denied when accessing the database.');
        console.error('This might be due to Row Level Security (RLS) policies in Supabase.');
        console.error('You can try:');
        console.error('1. Checking your RLS policies in the Supabase dashboard');
        console.error('2. Making sure you\'re using the correct credentials');
        console.error('3. Creating a simplified view with public access for read operations');
      }
      
      process.exit(1);
    }
    
    if (!feedbackData || feedbackData.length === 0) {
      console.log('No feedback data found. Please collect feedback using tools/feedback/collect_feedback.js first.');
      process.exit(0);
    }
    
    console.log(`\nFound ${feedbackData.length} feedback records:`);
    console.log('----------------------------------------------------------------');
    console.log('ID                  | Filename      | Predicted    | Corrected    | Created At');
    console.log('----------------------------------------------------------------');
    
    feedbackData.forEach(item => {
      // Format the data for display
      const id = item.id.substring(0, 18) + '...';
      const filename = (item.filename || '').padEnd(12).substring(0, 12);
      const predicted = (item.predicted_class || '').padEnd(12).substring(0, 12);
      const corrected = (item.correct_class || '').padEnd(12).substring(0, 12);
      const createdAt = new Date(item.created_at).toLocaleString();
      
      console.log(`${id} | ${filename} | ${predicted} | ${corrected} | ${createdAt}`);
    });
    
    console.log('\nTo provide feedback for a specific image:');
    console.log('node tools/feedback/collect_feedback.js <image_path> <correct_class>');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
displayFeedback(); 