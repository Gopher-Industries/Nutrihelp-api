import React from 'react';
import { useNavigate } from 'react-router-dom';
import WeeklyMealPlan from './WeeklyMealPlan';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './WeeklyMealPlan.css';

function WeeklyMealPlanPage() {
  const navigate = useNavigate();

  const handleExport = () => {
    const printArea = document.getElementById('meal-plan-pdf');
    if (!printArea) {
      alert('Meal plan content not found!');
      return;
    }

    html2canvas(printArea, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('Weekly_Meal_Plan.pdf');
    });
  };

  return (
    <div style={{ 
      padding: 'clamp(10px, 3vw, 20px)',
      backgroundColor: 'var(--background-color)',
      minHeight: '100vh',
      maxWidth: '100%', 
      boxSizing: 'border-box' 
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--primary-color)',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          padding: '8px 0',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'color 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.color = 'var(--primary-hover)'}
        onMouseLeave={(e) => e.target.style.color = 'var(--primary-color)'}
      >
        <span style={{ fontSize: '1.125rem' }}>←</span>
        <span>Back to Meals</span>
      </button>
      <h2 style={{ 
        textAlign: "center", 
        color: 'var(--text-primary)',
        fontSize: "clamp(1.375rem, 4vw, 2.25rem)",  
        lineHeight: 1.3,
        margin: "0 0 20px 0"
      }}>
        🌱 Weekly Meal Plan 🌱
      </h2>
      <WeeklyMealPlan 
        onExport={handleExport} 
        showExport={true} 
      />
    </div>
  );
}

export default WeeklyMealPlanPage;