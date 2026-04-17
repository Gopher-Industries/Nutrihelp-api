import React, { useState } from 'react';
import './HealthTools.css';

function WaterTracker({ recommendedWater }) {
  const [cupsDrank, setCupsDrank] = useState(0);
  const cupSize = 250;

  const handleAddCup = () => {
    setCupsDrank(cupsDrank + 1);
  };

  const totalDrank = cupsDrank * cupSize;
  const goalAchieved = totalDrank >= recommendedWater;

  return (
    <div className="card">
      <h3>Water Estimator</h3>
      <p className="progress-text">{totalDrank} / {recommendedWater} ml</p>
      <button className="primary-button" onClick={handleAddCup}>
        Add Cup
      </button>
      {goalAchieved && <p className="success-text">Goal Reached!</p>}
    </div>
  );
}

function HealthTools() {
  const [bodyWeight, setBodyWeight] = useState('');
  const [recommendedProtein, setRecommendedProtein] = useState(null);
  const [recommendedWater, setRecommendedWater] = useState(null);
  const [recommendedCalories, setRecommendedCalories] = useState(null);
  const [foodWeightPounds, setFoodWeightPounds] = useState('');
  const [foodWeightGrams, setFoodWeightGrams] = useState(null);
  const [activeTool, setActiveTool] = useState('macro');
  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiResult, setBmiResult] = useState(null);
  const [bodyFatGender, setBodyFatGender] = useState('male');
  const [bodyFatHeight, setBodyFatHeight] = useState('');
  const [bodyFatNeck, setBodyFatNeck] = useState('');
  const [bodyFatWaist, setBodyFatWaist] = useState('');
  const [bodyFatHip, setBodyFatHip] = useState('');
  const [bodyFatResult, setBodyFatResult] = useState(null);

  function calculateProteinIntake(weight) {
    return weight * 0.9;
  }

  function calculateWaterIntake(weight) {
    return weight * 35;
  }

  function calculateCalorieIntake(weight) {
    return weight * 30;
  }

  const handleCalculate = () => {
    if (bodyWeight && !isNaN(bodyWeight)) {
      const weight = parseFloat(bodyWeight);
      setRecommendedProtein(calculateProteinIntake(weight).toFixed(2));
      setRecommendedWater(calculateWaterIntake(weight).toFixed(2));
      setRecommendedCalories(calculateCalorieIntake(weight).toFixed(2));
    }
  };

  const handleConvertFoodWeight = () => {
    if (foodWeightPounds && !isNaN(foodWeightPounds)) {
      const kilograms = parseFloat(foodWeightPounds) * 0.453592;
      setFoodWeightGrams(kilograms.toFixed(2));
    }
  };

  const handleCalculateBmi = () => {
    if (!bmiWeight || !bmiHeight || isNaN(bmiWeight) || isNaN(bmiHeight)) {
      return;
    }
    const weightKg = parseFloat(bmiWeight);
    const heightM = parseFloat(bmiHeight) / 100;
    if (heightM <= 0) {
      return;
    }
    const bmi = weightKg / (heightM * heightM);
    setBmiResult(bmi.toFixed(1));
  };

  const handleCalculateBodyFat = () => {
    if (!bodyFatHeight || !bodyFatNeck || !bodyFatWaist) {
      return;
    }
    const heightIn = parseFloat(bodyFatHeight) / 2.54;
    const neckIn = parseFloat(bodyFatNeck) / 2.54;
    const waistIn = parseFloat(bodyFatWaist) / 2.54;
    if (isNaN(heightIn) || isNaN(neckIn) || isNaN(waistIn)) {
      return;
    }
    let bodyFat;
    if (bodyFatGender === 'female') {
      const hipIn = parseFloat(bodyFatHip) / 2.54;
      if (!bodyFatHip || isNaN(hipIn)) {
        return;
      }
      bodyFat =
        163.205 * Math.log10(waistIn + hipIn - neckIn) -
        97.684 * Math.log10(heightIn) -
        78.387;
    } else {
      bodyFat =
        86.010 * Math.log10(waistIn - neckIn) -
        70.041 * Math.log10(heightIn) +
        36.76;
    }
    setBodyFatResult(bodyFat.toFixed(1));
  };

  return (
    <div className="health-tools">
      <h1>Health Tool Calculator</h1>

      <div className="tool-tabs" role="tablist" aria-label="Health tools">
        <button
          type="button"
          className={`tool-tab ${activeTool === 'macro' ? 'active' : ''}`}
          onClick={() => setActiveTool('macro')}
          role="tab"
          aria-selected={activeTool === 'macro'}
        >
          Macro Calculator
        </button>
        <button
          type="button"
          className={`tool-tab ${activeTool === 'converter' ? 'active' : ''}`}
          onClick={() => setActiveTool('converter')}
          role="tab"
          aria-selected={activeTool === 'converter'}
        >
          Pounds to Kilogram
        </button>
        <button
          type="button"
          className={`tool-tab ${activeTool === 'bmi' ? 'active' : ''}`}
          onClick={() => setActiveTool('bmi')}
          role="tab"
          aria-selected={activeTool === 'bmi'}
        >
          BMI Calculator
        </button>
        <button
          type="button"
          className={`tool-tab ${activeTool === 'bodyfat' ? 'active' : ''}`}
          onClick={() => setActiveTool('bodyfat')}
          role="tab"
          aria-selected={activeTool === 'bodyfat'}
        >
          Body Fat %
        </button>
      </div>

      <div className="tool-panel">
        {activeTool === 'macro' && (
          <div className="card">
            <h3>Macro Calculator</h3>
            <input
              type="number"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              className="input-field"
              placeholder="Enter body weight in Kilograms ..."
            />
            <button className="primary-button" onClick={handleCalculate}>
              Calculate
            </button>
            {recommendedProtein && (
              <p className="result-text">Protein: {recommendedProtein} g</p>
            )}
            {recommendedWater && (
              <p className="result-text">Water: {recommendedWater} ml</p>
            )}
            {recommendedCalories && (
              <p className="result-text">Calories: {recommendedCalories} cal</p>
            )}
            {recommendedWater && (
              <WaterTracker recommendedWater={parseFloat(recommendedWater)} />
            )}
          </div>
        )}

        {activeTool === 'converter' && (
          <div className="card">
            <h3>Pounds to Kilogram Converter</h3>
            <input
              type="number"
              value={foodWeightPounds}
              onChange={(e) => setFoodWeightPounds(e.target.value)}
              className="input-field"
              placeholder="Enter pounds to be converted ..."
            />
            <button className="primary-button" onClick={handleConvertFoodWeight}>
              Convert
            </button>
            {foodWeightGrams && (
              <p className="result-text">
                {foodWeightPounds} lbs = {foodWeightGrams} kg
              </p>
            )}
          </div>
        )}

        {activeTool === 'bmi' && (
          <div className="card">
            <h3>BMI Calculator</h3>
            <div className="input-grid">
              <input
                type="number"
                value={bmiWeight}
                onChange={(e) => setBmiWeight(e.target.value)}
                className="input-field"
                placeholder="Weight (kg) ..."
              />
              <input
                type="number"
                value={bmiHeight}
                onChange={(e) => setBmiHeight(e.target.value)}
                className="input-field"
                placeholder="Height (cm) ..."
              />
            </div>
            <button className="primary-button" onClick={handleCalculateBmi}>
              Calculate BMI
            </button>
            {bmiResult && (
              <p className="result-text">Your BMI: {bmiResult}</p>
            )}
          </div>
        )}

        {activeTool === 'bodyfat' && (
          <div className="card">
            <h3>Body Fat % Calculator</h3>
            <select
              className="input-field"
              value={bodyFatGender}
              onChange={(e) => setBodyFatGender(e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <div className="input-grid">
              <input
                type="number"
                value={bodyFatHeight}
                onChange={(e) => setBodyFatHeight(e.target.value)}
                className="input-field"
                placeholder="Height (cm) ..."
              />
              <input
                type="number"
                value={bodyFatNeck}
                onChange={(e) => setBodyFatNeck(e.target.value)}
                className="input-field"
                placeholder="Neck (cm) ..."
              />
              <input
                type="number"
                value={bodyFatWaist}
                onChange={(e) => setBodyFatWaist(e.target.value)}
                className="input-field"
                placeholder="Waist (cm) ..."
              />
              {bodyFatGender === 'female' && (
                <input
                  type="number"
                  value={bodyFatHip}
                  onChange={(e) => setBodyFatHip(e.target.value)}
                  className="input-field"
                  placeholder="Hip (cm)"
                />
              )}
            </div>
            <button className="primary-button" onClick={handleCalculateBodyFat}>
              Calculate Body Fat %
            </button>
            {bodyFatResult && (
              <p className="result-text">Estimated Body Fat: {bodyFatResult}%</p>
            )}
          </div>
        )}
      </div>
      <section className="how-to-section" aria-label="How to use">
        <h2 className="how-to-title">How to use:</h2>
        <ul className="how-to-list">
          <li>Select an appropriate calculator for the required measurements.</li>
          <li>Enter your measurements in the fields provided.</li>
          <li>Press the calculate button to see your result.</li>
        </ul>
      </section>
    </div>
  );
}

export default HealthTools;
