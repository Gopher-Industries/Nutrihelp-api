// src/routes/Meal/PDFExport.js

import html2pdf from 'html2pdf.js';

export function exportMealPlanAsPDF(elementId) {
  const element = document.getElementById(elementId);

  if (!element) {
    alert('Meal plan element not found.');
    return;
  }

  const cloned = element.cloneNode(true);

  const style = document.createElement("style");
  style.innerHTML = `
    h2.day-header {
      font-size: 20px;
      margin-top: 20px;
      color: #1a237e;
      border-bottom: 2px solid #ccc;
      padding-bottom: 4px;
    }
    h3.meal-header {
      font-size: 16px;
      margin-top: 10px;
      color: #2e7d32;
      text-decoration: underline;
    }
    .meal-container {
      margin-bottom: 15px;
    }
    p {
      font-size: 14px;
    }
  `;
  cloned.prepend(style);

  html2pdf().from(cloned).set({
    filename: 'Weekly_Meal_Plan.pdf',
    html2canvas: { scale: 2 },
    jsPDF: { format: 'a4', orientation: 'portrait' }
  }).save();
}
