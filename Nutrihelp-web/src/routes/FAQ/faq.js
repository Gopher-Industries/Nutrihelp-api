import React, { useState } from "react";
import "./faq.css";

const FAQ = () => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [feedback, setFeedback] = useState("");

  const toggleFAQ = (categoryIndex, index) => {
    const activeKey = `${categoryIndex}-${index}`;
    setActiveIndex(activeIndex === activeKey ? null : activeKey);
  };

  const handleExpandCategory = (categoryIndex) => {
    setExpandedCategory(
      expandedCategory === categoryIndex ? null : categoryIndex
    );
  };

  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
  };

  const handleFeedbackSubmit = () => {
    if (feedback.trim() !== "") {
      alert(`Thank you for your feedback: "${feedback}"`);
      setFeedback("");
    } else {
      alert("Please enter your feedback before submitting.");
    }
  };

  const faqCategories = [
    {
      category: "General Information",
      questions: [
        {
          question: "What is NutriHelp?",
          answer:
            "NutriHelp is a comprehensive platform designed to support your nutritional goals by providing personalized meal plans, recipes, and expert guidance tailored to your health needs.",
        },
        {
          question: "How does NutriHelp work?",
          answer:
            "NutriHelp analyzes your dietary preferences and health goals, offering customized recommendations, meal plans, and tracking tools to ensure you're meeting your nutritional needs.",
        },
        {
          question: "Is NutriHelp available globally?",
          answer:
            "Yes, NutriHelp is accessible globally, though certain localized features may vary depending on your region.",
        },
        {
          question: "Can I access NutriHelp on mobile?",
          answer:
            "Yes, NutriHelp is mobile-friendly and accessible via any web browser or our official mobile app available for iOS and Android.",
        },
        {
          question: "Does NutriHelp provide professional consultation?",
          answer:
            "Yes, our platform includes an option for live consultations with certified dietitians and nutrition experts.",
        },
        {
          question: "How can NutriHelp help with chronic health conditions?",
          answer:
            "NutriHelp provides tailored meal plans and health tracking tools to support individuals managing conditions like diabetes, hypertension, and food allergies.",
        },
      ],
    },
    {
      category: "Account & Membership",
      questions: [
        {
          question: "How do I create an account?",
          answer:
            "Visit our signup page, enter your details, and follow the on-screen instructions to create an account.",
        },
        {
          question: "What are the membership plans available?",
          answer:
            "NutriHelp offers three membership plans: Free, Premium, and Professional. Visit our pricing page for detailed features and costs.",
        },
        {
          question: "Can I upgrade or downgrade my membership?",
          answer:
            "Yes, you can change your membership plan anytime from your account settings.",
        },
        {
          question: "What should I do if I forget my password?",
          answer:
            "Click 'Forgot Password' on the login page, enter your registered email, and follow the instructions to reset your password.",
        },
        {
          question: "How do I cancel my subscription?",
          answer:
            "You can cancel your subscription from your account settings. Ensure you do so before the next billing cycle to avoid charges.",
        },
      ],
    },
    {
      category: "Technical Support",
      questions: [
        {
          question: "How do I report a technical issue?",
          answer:
            "You can report technical issues via the 'Help & Support' section in your account or by emailing support@nutrihelp.com.",
        },
        {
          question: "What devices are compatible with NutriHelp?",
          answer:
            "NutriHelp is compatible with all modern devices, including smartphones, tablets, and desktop computers.",
        },
        {
          question: "Can I download my meal plans?",
          answer:
            "Yes, you can download your meal plans in PDF format from the 'Meal Planning' section of your account.",
        },
        {
          question: "What should I do if I encounter a login issue?",
          answer:
            "Ensure your credentials are correct and your internet connection is stable. If the issue persists, reset your password or contact support.",
        },
        {
          question: "How do I update the NutriHelp app?",
          answer:
            "Visit your device's app store and check for updates to download the latest version of the NutriHelp app.",
        },
      ],
    },
    {
      category: "Services",
      questions: [
        {
          question: "What types of meal plans are available?",
          answer:
            "NutriHelp offers meal plans for weight management, fitness goals, specific health conditions, and dietary preferences like vegan, keto, and gluten-free.",
        },
        {
          question: "Can I customize a recipe?",
          answer:
            "Yes, NutriHelp allows you to create and customize recipes based on your preferences and dietary needs.",
        },
        {
          question: "Do you provide shopping lists?",
          answer:
            "Yes, NutriHelp generates shopping lists based on your selected meal plans and recipes.",
        },
        {
          question: "Can I share my meal plan with others?",
          answer:
            "Yes, you can share your meal plans with friends and family via email or social media directly from the platform.",
        },
        {
          question: "Are the meal plans nutritionally balanced?",
          answer:
            "Yes, all meal plans are curated or reviewed by certified nutritionists to ensure they are nutritionally balanced.",
        },
        {
          question: "What is the Dine Pad service?",
          answer:
            "Dine Pad is a unique service that helps users find local restaurants offering meals that align with their nutritional goals.",
        },
      ],
    },
    {
      category: "Pricing & Plans",
      questions: [
        {
          question: "What is the cost of the Premium plan?",
          answer:
            "The Premium plan costs $9.99 per month or $99.99 annually. It includes advanced meal planning, detailed analytics, and priority support.",
        },
        {
          question: "Are there discounts for students?",
          answer:
            "Yes, students can avail themselves of a 20% discount on all paid plans by verifying their student status during signup.",
        },
        {
          question: "Is there a free trial available?",
          answer:
            "Yes, NutriHelp offers a 7-day free trial for all new users of the Premium plan.",
        },
        {
          question: "Can I cancel my subscription anytime?",
          answer:
            "Yes, you can cancel your subscription at any time through your account settings without any additional charges.",
        },
        {
          question: "Are refunds available for unused months?",
          answer:
            "Refunds are only available for annual plans if you cancel within 30 days of purchase.",
        },
        {
          question: "Do you offer group discounts?",
          answer:
            "Yes, group discounts are available for corporate or family accounts. Contact support for details.",
        },
      ],
    },
  ];
  

  return (
    <div className="faq-container">
      <div className="start-container">
        <h1 className="faq-title">Frequently Asked Questions</h1>
      </div>
      {faqCategories.map((category, catIndex) => (
        <div key={catIndex} className="faq-category">
          <div
            className={`faq-category-title ${expandedCategory === catIndex ? 'expanded' : ''}`}
            onClick={() => handleExpandCategory(catIndex)}
          >
            {category.category}
            <span className={`faq-category-toggle ${expandedCategory === catIndex ? 'expanded' : ''}` }>
              {expandedCategory === catIndex ? "-" : "+"}
            </span>
          </div>
          {expandedCategory === catIndex && (
            <div className="faq-list">
              {category.questions.map((faq, index) => {
                const key = `${catIndex}-${index}`;
                return (
                  <div
                    key={index}
                    className={`faq-item ${
                      activeIndex === key ? "active" : ""
                    }`}
                  >
                    <div
                      className="faq-question"
                      onClick={() => toggleFAQ(catIndex, index)}
                    >
                      {faq.question}
                      <span className="faq-toggle">
                        {activeIndex === key ? "-" : "+"}
                      </span>
                    </div>
                    <div
                      className={`faq-answer ${
                        activeIndex === key ? "visible" : ""
                      }`}
                    >
                      {faq.answer}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* 新增用户反馈模块 */}
      <div className="feedback-section">
        <div className="feedback-head">
          <h2>Still Need Help?</h2>
          <p>
            Our friendly support team is here to help you. Leave your question:
          </p>
        </div>
        <textarea
          placeholder="Enter your question here..."
          value={feedback}
          onChange={handleFeedbackChange}
          className="feedback-textarea"
        ></textarea>
        <button onClick={handleFeedbackSubmit} className="feedback-submit">
          Submit 
        </button>
      </div>
    </div>
  );
};

export default FAQ;
