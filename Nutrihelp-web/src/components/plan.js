import React from 'react';
import '../styles/auth.css';

function DailyNutritionPlanComponent() {
  return (
    <div className="main">
      <section className="signup">
        <div className="container">
          <div className="signup-content">
            <div className="signup-form">
              <h2 className="form-title">Daily Nutrition Plan</h2>
              <h4>Your Recommended Daily Intake</h4>
              <div className="form-group">
                <h3>Calories: <span style={{ position: 'absolute', right: '10px', color: 'blueviolet' }}>7536 kJ</span></h3>
                <hr />
                <h3>Carbohydrates: <span style={{ position: 'absolute', right: '10px', color: 'blueviolet' }}>at least 45g</span></h3>
                <hr />
                <h3>Protein: <span style={{ position: 'absolute', right: '10px', color: 'blueviolet' }}>at least 70g</span></h3>
                <hr />
                <h3>Fat: <span style={{ position: 'absolute', right: '10px', color: 'blueviolet' }}>at least 60g</span></h3>
                <hr />
                <h3>Water: <span style={{ position: 'absolute', right: '10px', color: 'blueviolet' }}>at least 3 cups</span></h3>
                <hr />
              </div>

              <div className="form-group">
                <h3>Health Conditions</h3>
                <h4>Your meals are rich in the following vitamins</h4>
                <button className="sel">Vitamin B6</button>
                <button className="sel">Vitamin D</button>

                <h4>Your meals are kept within these set limits</h4>
                <button className="sel">Limit Sodium 2400mg</button>
                <button className="sel">Limit Cholesterol 2800mg</button>
              </div>
              <hr />
              <div className="form-group form-button">
                <input type="submit" name="continue" className="form-submit" value="Continue" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DailyNutritionPlanComponent;
