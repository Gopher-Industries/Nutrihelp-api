/**
 * data/faqSeed.js
 *
 * Bundled FAQ entries used as a fallback when the `faq` Supabase table is
 * unavailable or empty. Keep these answers concise and product-accurate so
 * the /health-faq page is useful even before content has been migrated to
 * the database.
 */

module.exports = [
  {
    question: 'What is NutriHelp?',
    answer:
      'NutriHelp is a nutrition assistant that helps you plan meals, track macros, scan barcodes, and chat with an AI nutrition coach. Sign in to personalise recommendations to your dietary preferences and health goals.',
    category: 'Getting Started',
    sort_order: 1,
  },
  {
    question: 'How do I create an account?',
    answer:
      'Open the Sign Up page, enter your email and a password (or use Google sign-in), then verify the email we send you. You can complete your dietary profile from Settings → Preferences afterwards.',
    category: 'Getting Started',
    sort_order: 2,
  },
  {
    question: 'How are meal plans generated?',
    answer:
      'Plans are produced by combining your stored preferences (allergies, dietary style, calorie target) with our recipe library and an AI ranking model. You can regenerate any day, swap individual meals, or lock favourites.',
    category: 'Meal Plans',
    sort_order: 1,
  },
  {
    question: 'Can I export my meal plan?',
    answer:
      'Yes. From any plan view, choose Export → PDF or CSV. Shopping lists can also be exported from the Shopping List page.',
    category: 'Meal Plans',
    sort_order: 2,
  },
  {
    question: 'Is my health data private?',
    answer:
      'Health data is encrypted at rest and only accessible from your authenticated session. We never sell user data and you can request a full export or deletion at any time from Settings → Account.',
    category: 'Privacy & Security',
    sort_order: 1,
  },
  {
    question: 'What should I do if I forgot my password?',
    answer:
      'Use the "Forgot Password" link on the sign-in page. We will email you a one-time link valid for 30 minutes. If you do not see it, check spam or contact support.',
    category: 'Account',
    sort_order: 1,
  },
  {
    question: 'How accurate is the BMI calculator?',
    answer:
      'BMI is a screening metric, not a diagnosis. NutriHelp uses the standard formula (weight in kg / height in m squared). Talk to a healthcare professional before changing your diet based on BMI alone.',
    category: 'Health Tools',
    sort_order: 1,
  },
  {
    question: 'Does the chatbot give medical advice?',
    answer:
      'No. The NutriHelp chatbot can summarise nutrition concepts and help you navigate the app, but it does not replace professional medical advice. Always consult a clinician for medical decisions.',
    category: 'Health Tools',
    sort_order: 2,
  },
  {
    question: 'How do I contact support?',
    answer:
      'Use the Contact Us form. Submissions are routed to our support inbox and you will receive an automatic acknowledgement email. Typical response time is one business day.',
    category: 'Support',
    sort_order: 1,
  },
  {
    question: 'How do I report a bug or request a feature?',
    answer:
      'Open the Feedback page from the navigation menu and choose the relevant category. Screenshots and steps to reproduce help us triage faster.',
    category: 'Support',
    sort_order: 2,
  },
];
