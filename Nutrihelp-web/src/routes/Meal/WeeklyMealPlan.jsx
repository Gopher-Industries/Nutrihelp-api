// src/routes/Meal/WeeklyMealPlan.jsx
import React, { useEffect, useState } from 'react';
import { fetchWeeklyMealPlan } from './WeeklyMealUtils';
import DayRow from './components/DayRow'; 
import './WeeklyMealPlan.css';

const WeeklyMealPlan = ({ onExport, showExport = true }) => {
  const [mealPlan, setMealPlan] = useState([]);
  const [ingredientsByRecipe, setIngredientsByRecipe] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const { plan, ingredients } = await fetchWeeklyMealPlan();
        setMealPlan(plan || []);
        setIngredientsByRecipe(ingredients || {});
        // Optional: surface empty-state hint
        if ((plan || []).every(d => !d.breakfast && !d.lunch && !d.dinner)) {
          setError('No recipes returned. Check Supabase RLS and data (meal_type casing / is_published).');
        }
      } catch (err) {
        console.error('Error generating meal plan:', err?.message || err);
        setError('Failed to generate weekly meal plan.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  if (loading) return <p>Loading weekly meal plan...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      padding: '20px', 
      fontFamily: 'Segoe UI, sans-serif', 
      overflowX: 'hidden', 
      width: '100%'
    }}>
      <h2 style={{ 
        color: 'var(--text-primary)', 
        textAlign: 'center',
        fontSize: "clamp(1.375rem, 4vw, 2.25rem)",
        lineHeight: 1.3,
        margin: "0 0 20px 0"
      }}>
        Weekly Meal Plan
      </h2>
      
      {showExport && onExport && (
        <button
          onClick={onExport}
          style={{ 
            backgroundColor: 'var(--primary-color)', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            margin: '20px 0', 
            cursor: 'pointer', 
            borderRadius: '5px', 
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          Export as PDF
        </button>
      )}

      <div id="meal-plan-pdf" style={{ width: '100%', maxWidth: 1200 }}>
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
};

export default WeeklyMealPlan;