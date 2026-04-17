import { useState } from "react";
import "../FAQ/faq.css";
import "./HealthFAQ.css";

function HealthFAQ() {
  const [activeCategory, setActiveCategory] = useState("general");
  const [openItems, setOpenItems] = useState({});
  const [feedback, setFeedback] = useState("");

  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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

  const faqData = {
    general: [
      {
        id: "water-intake",
        question: "How much water should I drink daily?",
        answer: "The general recommendation is about 2 liters or 8 glasses of water per day. However, individual needs may vary depending on factors like age, gender, weather, and physical activity. A good indicator is the color of your urine - it should be light yellow."
      },
      {
        id: "calorie-intake",
        question: "How many calories do I need per day?",
        answer: "Calorie needs vary based on age, gender, weight, height, and activity level. Generally, adult women need 1,600-2,400 calories per day, and adult men need 2,000-3,000 calories. Use a calorie calculator for a more personalized estimate."
      },
      {
        id: "meals-per-day",
        question: "How many meals should I eat per day?",
        answer: "There's no one-size-fits-all answer, but most nutrition experts recommend 3 main meals with 1-2 healthy snacks. The key is to listen to your body's hunger and fullness cues rather than strictly adhering to a specific number of meals."
      },
      {
        id: "healthy-weight",
        question: "What's a healthy way to maintain weight?",
        answer: "A balanced diet rich in whole foods, regular physical activity (at least 150 minutes of moderate exercise weekly), adequate sleep, and stress management are key components of healthy weight maintenance. Focus on lifestyle changes rather than short-term diets."
      },
      {
        id: "hydration-signs",
        question: "What are signs of dehydration?",
        answer: "Common signs of dehydration include thirst, dry mouth, fatigue, dizziness, reduced urine output, and dark yellow urine. Severe dehydration can cause rapid heartbeat, sunken eyes, and confusion, requiring immediate medical attention."
      },
      {
        id: "sleep-importance",
        question: "How does sleep affect nutrition and health?",
        answer: "Quality sleep regulates hormones that control appetite (ghrelin and leptin), supports metabolism, and aids recovery. Chronic sleep deprivation increases cravings for high-calorie foods and is linked to weight gain and metabolic disorders."
      },
      {
        id: "alcohol-guidelines",
        question: "What are the recommended alcohol limits?",
        answer: "Moderate alcohol consumption is defined as up to 1 drink per day for women and up to 2 drinks per day for men. Excessive alcohol contributes to weight gain, liver disease, and increases cancer risk while providing empty calories with minimal nutritional value."
      }
    ],
    nutrients: [
      {
        id: "protein-intake",
        question: "How much protein do I need daily?",
        answer: "The Recommended Dietary Allowance (RDA) is 0.8 grams of protein per kilogram of body weight. For a 150-pound (68 kg) person, this equals about 55 grams of protein per day. Athletes and older adults may need more, around 1.2-2.0 grams per kilogram."
      },
      {
        id: "fiber-intake",
        question: "What is the recommended daily fiber intake?",
        answer: "The Academy of Nutrition and Dietetics recommends 25 grams per day for women and 38 grams per day for men. After age 50, the recommendation decreases slightly to 21 grams for women and 30 grams for men."
      },
      {
        id: "sugar-limit",
        question: "How much sugar is too much?",
        answer: "The American Heart Association recommends no more than 6 teaspoons (25 grams) of added sugar per day for women and 9 teaspoons (38 grams) for men. Natural sugars in fruits and dairy are not included in this limit."
      },
      {
        id: "healthy-fats",
        question: "What are healthy sources of dietary fat?",
        answer: "Healthy fats include avocados, nuts, seeds, olive oil, fatty fish (like salmon and mackerel), and nut butters. These contain monounsaturated and polyunsaturated fats that support heart health when consumed in moderation."
      },
      {
        id: "carbohydrates",
        question: "Which carbohydrates are best for health?",
        answer: "Complex carbohydrates are preferable, including whole grains (oats, quinoa, brown rice), legumes, fruits, and vegetables. These provide fiber, vitamins, and minerals compared to refined carbohydrates like white bread and sugary snacks."
      },
      {
        id: "protein-sources",
        question: "What are good plant-based sources of protein?",
        answer: "Excellent plant-based protein sources include legumes (beans, lentils, chickpeas), tofu, tempeh, edamame, quinoa, nuts, seeds, and soy products. Combining different plant proteins can provide all essential amino acids."
      },
      {
        id: "trans-fats",
        question: "What are trans fats and why are they harmful?",
        answer: "Trans fats are artificially created through hydrogenation and are found in many processed foods. They raise bad (LDL) cholesterol while lowering good (HDL) cholesterol, increasing heart disease risk. Many countries have banned artificial trans fats, but they may still appear as 'partially hydrogenated oils' on labels."
      },
      {
        id: "omega3-benefits",
        question: "Why are omega-3 fatty acids important?",
        answer: "Omega-3s support brain function, reduce inflammation, and promote heart health. The body can't produce them, so they must come from diet. Best sources include fatty fish (salmon, mackerel), flaxseeds, chia seeds, walnuts, and algae-based supplements."
      }
    ],
    vitamins: [
      {
        id: "vitamin-d",
        question: "How much vitamin D do I need?",
        answer: "The recommended daily allowance for vitamin D is 600-800 IU (15-20 mcg) for most adults. Some experts suggest higher amounts, especially for those with limited sun exposure. Always consult with a healthcare provider before supplementing."
      },
      {
        id: "vitamin-c",
        question: "What is the daily requirement for vitamin C?",
        answer: "The recommended daily amount for vitamin C is 75 mg for women and 90 mg for men. Smokers need an additional 35 mg per day. Vitamin C is abundant in citrus fruits, berries, peppers, and broccoli."
      },
      {
        id: "vitamin-b12",
        question: "Who is at risk for vitamin B12 deficiency?",
        answer: "Vitamin B12 deficiency is more common in older adults, vegetarians, and vegans since B12 is primarily found in animal products. Those with gastrointestinal disorders that affect absorption may also be at risk and might require supplements."
      },
      {
        id: "vitamin-a",
        question: "What are the benefits of vitamin A?",
        answer: "Vitamin A supports vision health, immune function, and skin health. Good sources include carrots, sweet potatoes, spinach, kale, and liver. It's important not to exceed recommended doses as excessive vitamin A can be toxic."
      },
      {
        id: "vitamin-e",
        question: "What does vitamin E do for the body?",
        answer: "Vitamin E is a powerful antioxidant that protects cells from damage. It also supports immune function and helps widen blood vessels to prevent blood clots. Sources include nuts, seeds, vegetable oils, and leafy green vegetables."
      },
      {
        id: "vitamin-k",
        question: "Why is vitamin K important?",
        answer: "Vitamin K is essential for blood clotting and bone metabolism. There are two forms: K1 (found in leafy greens) and K2 (produced by gut bacteria and found in fermented foods). Adults need about 90-120 mcg daily."
      },
      {
        id: "b-complex",
        question: "What is the role of B-complex vitamins?",
        answer: "B vitamins help convert food into energy, support nervous system function, and aid in red blood cell formation. The eight B vitamins work synergistically and are found in whole grains, meat, eggs, seeds, and dark leafy vegetables."
      }
    ],
    minerals: [
      {
        id: "sodium-intake",
        question: "How much sodium should I consume daily?",
        answer: "The American Heart Association recommends no more than 2,300 mg per day, with an ideal limit of 1,500 mg for most adults. Excessive sodium intake is linked to high blood pressure and increased risk of heart disease."
      },
      {
        id: "calcium-requirements",
        question: "How much calcium do I need?",
        answer: "Adults aged 19-50 need 1,000 mg of calcium per day. Women over 50 and men over 70 need 1,200 mg per day. Good sources include dairy products, leafy greens, fortified plant milks, and calcium-set tofu."
      },
      {
        id: "iron-sources",
        question: "What are good sources of iron?",
        answer: "Iron comes in two forms: heme (from animal sources) and non-heme (from plants). Heme iron from red meat, poultry, and fish is more easily absorbed. Plant sources include spinach, lentils, tofu, and fortified cereals, with absorption improved when eaten with vitamin C."
      },
      {
        id: "magnesium-needs",
        question: "How much magnesium do I need daily?",
        answer: "Adult men need 400-420 mg of magnesium daily, while adult women need 310-320 mg. Magnesium supports muscle and nerve function, energy production, and bone health. Sources include nuts, seeds, whole grains, and leafy green vegetables."
      },
      {
        id: "potassium-importance",
        question: "Why is potassium important?",
        answer: "Potassium helps regulate fluid balance, muscle contractions, and nerve signals. It also helps counteract some of sodium's effects on blood pressure. Adults need 2,600-3,400 mg daily, found in bananas, potatoes, spinach, beans, and avocados."
      },
      {
        id: "zinc-function",
        question: "What is zinc's role in the body?",
        answer: "Zinc supports immune function, wound healing, DNA synthesis, and growth and development. Adult men need 11 mg daily, women 8 mg. Sources include oysters, red meat, poultry, beans, nuts, and whole grains."
      },
      {
        id: "iodine-sources",
        question: "Why is iodine important and where can I get it?",
        answer: "Iodine is essential for thyroid hormone production, which regulates metabolism. Deficiency can cause goiter and developmental issues. Good sources include iodized salt, seafood, dairy products, and seaweed. Adults need about 150 mcg daily."
      },
      {
        id: "selenium-benefits",
        question: "What does selenium do for the body?",
        answer: "Selenium acts as an antioxidant, supports thyroid function, and helps make DNA. Brazil nuts are exceptionally rich in selenium—just one nut provides more than the daily requirement. Other sources include seafood, meat, and whole grains."
      }
    ]
  };

  const currentItems = faqData[activeCategory] || [];

  return (
    <div className="health-faq-container">
      <h1 className="health-faq-title">Nutrition & Health Intake FAQ</h1>
      <div className="category-selector">
        <button
          className={activeCategory === "general" ? "active" : ""}
          onClick={() => setActiveCategory("general")}
        >
          General
        </button>
        <button
          className={activeCategory === "nutrients" ? "active" : ""}
          onClick={() => setActiveCategory("nutrients")}
        >
          Nutrients
        </button>
        <button
          className={activeCategory === "vitamins" ? "active" : ""}
          onClick={() => setActiveCategory("vitamins")}
        >
          Vitamins
        </button>
        <button
          className={activeCategory === "minerals" ? "active" : ""}
          onClick={() => setActiveCategory("minerals")}
        >
          Minerals
        </button>
      </div>

      <div className="faq-list">
        {currentItems.map((item) => {
          const isOpen = openItems[item.id] || false;

          return (
            <div key={item.id} className="faq-item">
              <div
                className="faq-question"
                onClick={() => toggleItem(item.id)}
              >
                <h3>{item.question}</h3>
                <span className={`toggle-icon ${isOpen ? "open" : ""}`}>
                  ▼
                </span>
              </div>
              {isOpen && (
                <div className="faq-health-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
}

export default HealthFAQ;