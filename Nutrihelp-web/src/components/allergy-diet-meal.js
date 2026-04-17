import React from 'react';
import '../styles/auth.css'
function Allergy() {
  return (
    <div className="main">
      <section className="signup">
        <div className="container">
          <div className="signup-content">
            <div className="signup-form">
              <h2 className="form-title">Meal Planning</h2>
              <hr />
              <h3>Select meals for personalized planning</h3>
              <div className="form-group">
                <button className="sel">Breakfast</button>
                <button className="sel">Lunch</button>
                <button className="sel">Dinner</button>
                <button className="sel">Desert</button>
              </div>
              <hr />
              <div className="form-group form-button">
                <input type="submit" name="continue" className="form-submit" value="Continue" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="signup">
        <div className="container">
          <div className="signup-content">
            <div className="signup-form">
              <h2 className="form-title">Dietary Requirements</h2>
              <div className="diet-form">
                <div className="form-group" id="sd">
                  <div className="searchable-dropdown">
                    <input type="text" id="diet-input" placeholder="Search dislikes" />
                    <ul id="diet-list">
                      <li id="option-1" data-value="1">input 1</li>
                      <hr />
                      <li data-value="2">input 2</li>
                      <hr />
                      <li data-value="3">input 3</li>
                      <hr />
                      <li data-value="4">input 4</li>
                    </ul>
                  </div>
                </div>
                <div className="form-group">
                  <div className="form-group">
                    <button className="sel">Vegetarian</button>
                    <button className="sel">Vegan</button>
                    <button className="sel">Keto</button>
                    <button className="sel">Pescetarian</button>
                    <button className="sel">Low Carb</button>
                  </div>
                </div>
                <hr />
                <h2 className="form-title">Allergies</h2>
                <div className="form-group" id="sd2">
                  <div className="searchable-dropdown">
                    <input type="text" id="allergy-input" placeholder="Search conditions" />
                    <ul id="allergy-list">
                      <li id="option-1" data-value="1">item 1</li>
                      <hr />
                      <li data-value="2">item 2</li>
                      <hr />
                      <li data-value="3">item 3</li>
                      <hr />
                      <li data-value="4">item 4</li>
                    </ul>
                  </div>
                </div>
                <div className="form-group">
                  <button className="sel">Soy</button>
                  <button className="sel">Dairy</button>
                  <button className="sel">Fish</button>
                  <button className="sel">Eggs</button>
                  <button className="sel">Gluten</button>
                </div>
                <div className="form-group form-button">
                  <input type="submit" name="continue" className="form-submit" value="Continue" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Allergy;
