import React, { useState, useRef } from "react";
import "./SymptomAssessment.css";
 
const symptomsList = [
  "Fatigue",
  "Dry Skin",
  "Dizziness",
  "Muscle Weakness",
  "Hair loss",
  "Poor Concentration",
  "Headaches",
  "Anxiety",
  "Joint Pain",
  "Muscle Cramps",
  "Bleeding Gums",
  "Constipation",
];
 
const deficiencyMapping = {
  Fatigue: ["Iron", "Vitamin B12", "Vitamin B2", "Magnesium", "Vitamin D"],
  "Dry Skin": ["Vitamin C", "Vitamin A", "Omega-3 fatty acids", "Zinc"],
  Dizziness: ["Iron", "Vitamin B12", "Folate"],
  "Muscle Weakness": ["Vitamin D", "Magnesium", "Potassium", "Calcium"],
  "Hair loss": ["Iron", "Zinc", "Biotin", "Protein"],
  "Poor Concentration": ["Omega-3 fatty acids", "Iron", "Vitamin B12"],
  Headaches: ["Magnesium", "Vitamin B2", "Hydration"],
  Anxiety: ["Magnesium", "Vitamin B6", "Omega-3 fatty acids", "Zinc"],
  "Joint Pain": ["Vitamin D", "Omega-3 fatty acids", "Vitamin C"],
  "Muscle Cramps": ["Magnesium", "Potassium", "Calcium", "Vitamin B1"],
  "Bleeding Gums": ["Vitamin C"],
  Constipation: ["Fiber", "Magnesium", "Water"],
};
 
const deficiencyEffects = {
  Iron: "fatigue",
  "Vitamin B12": "fatigue and dizziness",
  "Vitamin B2": "fatigue",
  Magnesium: "muscle cramps and headaches",
  "Vitamin D": "muscle weakness and joint pain",
  "Vitamin C": "dry skin and bleeding gums",
  "Vitamin A": "dry skin",
  "Omega-3 fatty acids": "poor concentration and joint pain",
  Zinc: "dry skin and anxiety",
  Folate: "dizziness",
  Potassium: "muscle cramps",
  Calcium: "muscle cramps and bone pain",
  Biotin: "hair loss",
  Protein: "hair loss and poor healing",
  Hydration: "headaches and constipation",
  "Vitamin B6": "anxiety",
  Fiber: "constipation",
  Water: "constipation",
  "Vitamin B1": "muscle cramps",
};
 
const deficiencyToSymptoms = {
  Iron: ["Fatigue", "Dizziness", "Hair loss", "Poor Concentration"],
  "Vitamin B12": ["Fatigue", "Dizziness", "Poor Concentration"],
  "Vitamin B2": ["Fatigue", "Headaches"],
  Magnesium: [
    "Fatigue",
    "Muscle Weakness",
    "Headaches",
    "Anxiety",
    "Muscle Cramps",
    "Constipation",
  ],
  "Vitamin D": ["Fatigue", "Muscle Weakness", "Joint Pain"],
  "Vitamin C": ["Dry Skin", "Bleeding Gums", "Joint Pain"],
  "Vitamin A": ["Dry Skin"],
  "Omega-3 fatty acids": [
    "Dry Skin",
    "Poor Concentration",
    "Anxiety",
    "Joint Pain",
  ],
  Zinc: ["Dry Skin", "Hair loss", "Anxiety"],
  Folate: ["Dizziness"],
  Potassium: ["Muscle Weakness", "Muscle Cramps"],
  Calcium: ["Muscle Weakness", "Muscle Cramps"],
  Biotin: ["Hair loss"],
  Protein: ["Hair loss"],
  Hydration: ["Headaches", "Constipation"],
  "Vitamin B6": ["Anxiety"],
  Fiber: ["Constipation"],
  Water: ["Constipation"],
  "Vitamin B1": ["Muscle Cramps"],
};
 
const mealSuggestions = {
  Iron: [
    { name: "Spinach Salad", note: "High in Iron", image: "spinach_salad.jpg" },
    { name: "Lentil Soup", note: "Rich iron source", image: "lentil_soup.jpg" },
    { name: "Spinach Salad", note: "Iron & folate" },
  ],
  "Vitamin B12": [
    {
      name: "Grilled Chicken",
      note: "Good source of B12",
      image: "grilled_chicken.jpg",
    },
    {
      name: "Beef or Chicken Liver",
      note: "High in B12",
      image: "beef_or_chicken_liver.jpg",
    },
    {
      name: "Grilled Salmon",
      note: "Omega-3 & B12",
      image: "grilled_salmon.jpg",
    },
  ],
  "Vitamin B2": [
    {
      name: "Spinach Salad",
      note: "Magnesium, B2",
      image: "spinach_salad.jpg",
    },
  ],
  Magnesium: [
    { name: "Almonds", note: "High in magnesium", image: "almonds.jpg" },
    {
      name: "Dark Chocolate",
      note: "Contains magnesium",
      image: "dark_chocolate.jpg",
    },
  ],
  "Vitamin D": [
    { name: "Salmon", note: "High in Vitamin D", image: "salmon.jpg" },
    {
      name: "Fortified Milk",
      note: "Vitamin D rich",
      image: "fortified_milk.jpg",
    },
  ],
  "Vitamin C": [
    { name: "Kiwi", note: "Good source of Vitamin C", image: "kiwi.jpg" },
    {
      name: "Citrus Fruits",
      note: "Rich in Vitamin C",
      image: "citrus_fruits.jpg",
    },
    {
      name: "Bell Peppers",
      note: "High in Vitamin C",
      image: "bell_peppers.jpg",
    },
    { name: "Broccoli", note: "Contains Vitamin C", image: "Broccoli.jpg" },
  ],
  "Vitamin A": [
    {
      name: "Carrot Soup",
      note: "High in Vitamin A",
      image: "carrot_soup.jpg",
    },
  ],
  "Omega-3 fatty acids": [
    {
      name: "Grilled Salmon",
      note: "Rich in omega-3",
      image: "grilled_salmon.jpg",
    },
  ],
  Zinc: [
    { name: "Pumpkin Seeds", note: "Zinc source", image: "pumpkin_seeds.jpg" },
  ],
  Folate: [
    { name: "Lentil Soup", note: "Iron & folate", image: "lentil_soup.jpg" },
  ],
  Potassium: [
    { name: "Bananas", note: "Potassium-rich", image: "bananas.jpg" },
  ],
  Calcium: [{ name: "Dairy", note: "Calcium source", image: "dairy.jpg" }],
  Biotin: [{ name: "Eggs", note: "Biotin & protein", image: "eggs.jpg" }],
  Protein: [
    {
      name: "Nuts and Seeds",
      note: "Zinc & protein",
      image: "nuts_seeds.jpg",
    },
  ],
  Hydration: [
    {
      name: "Hydrating Fruits",
      note: "Watermelon, cucumber",
      image: "hydrating_fruits.jpg",
    },
  ],
  "Vitamin B6": [
    { name: "Bananas", note: "Source of B6", image: "bananas.jpg" },
  ],
  Fiber: [
    { name: "Lentil Soup", note: "High in fiber", image: "lentil_soup.jpg" },
    { name: "Leafy Greens", note: "Good fiber", image: "leafy_greens.jpg" },
  ],
  Water: [
    {
      name: "Chia Seeds and Yogurt",
      note: "Supports hydration",
      image: "chia_seeds_yogurt.jpg",
    },
  ],
  "Vitamin B1": [
    { name: "Whole Grains", note: "Source of B1", image: "whole_grains.jpg" },
  ],
};
export default function SymptomAssessmentPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [deficiencies, setDeficiencies] = useState([]);
  const [meals, setMeals] = useState([]);
  const formSectionRef = useRef(null);
 
  const handleToggleSymptom = (symptom) => {
    const updatedSymptoms = selectedSymptoms.includes(symptom)
      ? selectedSymptoms.filter((s) => s !== symptom)
      : [...selectedSymptoms, symptom];
 
    setSelectedSymptoms(updatedSymptoms);
 
   
    const deficiencySet = new Set();
    updatedSymptoms.forEach((symptom) => {
      const relatedDeficiencies = deficiencyMapping[symptom];
      if (relatedDeficiencies) {
        relatedDeficiencies.forEach((def) => deficiencySet.add(def));
      }
    });
 
    const deficiencyList = Array.from(deficiencySet);
    setDeficiencies(deficiencyList);
 

    const mealMap = {};
 
    deficiencyList.forEach((def) => {
      const mealsForDef = mealSuggestions[def];
      if (mealsForDef) {
        mealsForDef.forEach((meal) => {
          const key = meal.name;
          if (!mealMap[key]) {
            mealMap[key] = { name: key, note: meal.note };
          } else {
           
            if (!mealMap[key].note.includes(meal.note)) {
              mealMap[key].note += ` & ${meal.note}`;
            }
          }
        });
      }
    });
 
    
    setMeals(Object.values(mealMap));
  };
 
  const handleGetStarted = () => {
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
 
  return (
    <div className="symptom-assessment-wrapper">
      {}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>
              Symptom-Based <br /> Nutrient Assessment
            </h1>
            <p>Identify potential nutrient deficiencies based on symptoms</p>
            <button className="get-started-btn" onClick={handleGetStarted}>
              GET STARTED
            </button>
          </div>
          <img src="/images/symptom_assessment/symptom.png" alt="Health" className="hero-image" />
        </div>
      </div>

      {}
      <div className="form-section" ref={formSectionRef}>
        <h2>Describe how you are feeling?</h2>
        <div className="symptom-grid">
          {symptomsList.map((symptom) => (
            <label key={symptom} className="symptom-option">
              <input
                type="checkbox"
                className="symptom-checkbox"
                checked={selectedSymptoms.includes(symptom)}
                onChange={() => handleToggleSymptom(symptom)}
              />
              <span className="symptom-chip">{symptom}</span>
            </label>
          ))}
        </div>
      </div>
 
      {}
      {deficiencies.length > 0 && (
        <div className="results-section">
          <h3>Possible Nutrient Deficiencies</h3>
          <div className="card-grid">
            {deficiencies.map((def) => {
             
              const symptomsLinked =
                deficiencyToSymptoms[def]?.filter((sym) =>
                  selectedSymptoms.includes(sym)
                ) || [];
 
              return (
                <div key={def} className="result-card">
                  <h4>{def}</h4>
                  <p>
                    {symptomsLinked.length > 0
                      ? `This deficiency may lead to ${symptomsLinked
                          .join(" and ")
                          .toLowerCase()}.`
                      : "This deficiency may be linked to your selected symptoms."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
 
      {}
      {meals.length > 0 && (
        <div className="results-section">
          <h3>Meal Suggestions</h3>
          <div className="card-grid">
            {meals.map((meal) => (
              <div key={meal.name} className="result-card">
                <img
                  src={`/images/symptom_assessment/${
                    meal.name
                      .toLowerCase()
                      .replace(/ and | & /g, "_")
                      .replace(/[^a-z0-9]/g, "_")
                      .replace(/_+/g, "_") 
                      .replace(/^_|_$/g, "") 
                  }.jpg`}
                  alt={meal.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/symptom_assessment/placeholder.jpg"; 
                  }}
                />
                <h4>{meal.name}</h4>
                <p>{meal.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
 
