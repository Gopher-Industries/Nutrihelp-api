// src/routes/Meal/PersonalizedWeeklyPlan.jsx
import React, { useEffect, useState } from 'react';
import { fetchPersonalizedMealPlan } from './WeeklyMealUtils';
import DayRow from './components/DayRow';

export default function PersonalizedWeeklyPlan({ filters, onExport, showExport = true }) {
  const [mealPlan, setMealPlan] = useState([]);
  const [ingredientsByRecipe, setIngredientsByRecipe] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { plan, ingredients } = await fetchPersonalizedMealPlan(filters);
        if (mounted) {
          setMealPlan(plan || []);
          setIngredientsByRecipe(ingredients || {});
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to build personalized plan.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  if (loading) return <p>Building your personalized plan...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      {showExport && onExport && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onExport}
          style={{
            backgroundColor: '#005BBB',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            margin: '10px 0',
            cursor: 'pointer',
            borderRadius: '5px',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Export as PDF
        </button>
        </div>
      )}

      <div id="personalized-meal-plan">
        {mealPlan.map((dayPlan, idx) => (
          <DayRow
            key={idx}
            dayPlan={dayPlan}
            ingredientsByRecipe={ingredientsByRecipe}
          />
        ))}
      </div>
    </div>
  );
}
