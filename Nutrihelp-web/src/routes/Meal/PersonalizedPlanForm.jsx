// src/routes/Meal/PersonalizedPlanForm.jsx
import React, { useState } from 'react';

const DIET_TYPES = [
  { value: 'Balanced', label: 'Balanced' },
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Pescatarian', label: 'Pescatarian' },
  { value: 'Gluten-Free', label: 'Gluten-Free' },
  { value: 'Low-Carb', label: 'Low-Carb' },
  { value: 'High-Protein', label: 'High-Protein' },
];

const GOALS = [
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Weight Loss', label: 'Weight Loss' },
  { value: 'Weight Gain', label: 'Weight Gain' },
  { value: 'Muscle Gain', label: 'Muscle Gain' },
];

// Shellfish removed per your request
const ALLERGENS = ['Nuts', 'Dairy', 'Soy', 'Gluten'];

export default function PersonalizedPlanForm({ onGenerate, onExport }) {
  const [dietType, setDietType] = useState('Balanced');
  const [goal, setGoal] = useState('Maintenance');
  const [allergies, setAllergies] = useState([]);

  const toggleAllergy = (a) => {
    setAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({ dietType, goal, allergies });
  };

  return (
    <form className="personalize-card" onSubmit={handleSubmit}>
      <h2 className="personalize-title">Personalize Weekly Plan</h2>

      <div className="personalize-grid">
        <label className="personalize-field">
          <span className="personalize-label">Diet Type</span>
          <select
            className="personalize-input"
            value={dietType}
            onChange={(e) => setDietType(e.target.value)}
          >
            {DIET_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>

        <label className="personalize-field">
          <span className="personalize-label">Goal</span>
          <select
            className="personalize-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>

        <div className="personalize-field">
          <span className="personalize-label">Allergies (exclude)</span>
          <div className="chip-row">
            {ALLERGENS.map((a) => {
              const active = allergies.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  className={`chip ${active ? 'chip--active' : ''}`}
                  onClick={() => toggleAllergy(a)}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="personalize-actions" style={{ display: 'flex', gap: 12 }}>
        <button type="submit" className="btn-primary-solid">
          Generate Personalized Plan
        </button>
        {onExport && (
          <button type="button" className="export-btn" onClick={onExport}>
            Export as PDF
          </button>
        )}
      </div>
    </form>
  );
}
