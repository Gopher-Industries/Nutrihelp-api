import React from 'react';
import './YourPreferences.css';

function YourPreferences() {
  return (
    <div className="yp-theme-page">

      <h2 className="yp-title">TEST TITLE</h2>

      <div className="yp-image-wrapper">
        <img src="./images/pref.jpg" alt="Preferences" />
      </div>

      <p className="yp-subtitle">Please confirm your selections</p>

      <div className="yp-card">

        <div className="yp-group">
          <h3>Special Dietary Requirements</h3>
          <button className="yp-pill">None</button>
        </div>

        <div className="yp-group">
          <h3>Allergies</h3>
          <button className="yp-pill">Dairy</button>
        </div>

        <div className="yp-group">
          <h3>Dislikes</h3>
          <button className="yp-pill">Ginger</button>
          <button className="yp-pill">Mushrooms</button>
        </div>

        <div className="yp-group">
          <h3>Health Conditions</h3>
          <button className="yp-pill">Vitamin B6 deficiency</button>
          <button className="yp-pill">Vitamin D deficiency</button>
          <button className="yp-pill">Limit Sodium 2400mg</button>
          <button className="yp-pill">Limit Cholesterol 2800mg</button>
        </div>

      </div>

      <div className="yp-actions">
        <button className="yp-confirm">Confirm Choices</button>
        <button className="yp-redo">Redo</button>
      </div>

    </div>
  );
}

export default YourPreferences;
