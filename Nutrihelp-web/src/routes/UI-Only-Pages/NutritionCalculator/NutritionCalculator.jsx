import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './NutritionCalculator.css';
 
const COLORS = ['#10b981', '#ef4444', '#f59e0b'];
 
const NutritionCalculator = () => {
  const [foodItems, setFoodItems] = useState([{ name: '', quantity: '', unit: '', mealType: '' }]);
  const [nutrition, setNutrition] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [perItemNutrition, setPerItemNutrition] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState([]);
  const [showChart, setShowChart] = useState(false);
 
  const handleChange = (index, key, value) => {
    const updated = [...foodItems];
    updated[index][key] = value;
    setFoodItems(updated);
  };
 
  const addFoodItem = () => {
    setFoodItems([...foodItems, { name: '', quantity: 1, unit: 'g', mealType: '' }]);
  };
 
  const removeFoodItem = () => {
    if (foodItems.length > 1) {
      setFoodItems(foodItems.slice(0, -1));
    }
  };
 
  const fetchNutrition = async () => {
    const hasMissingFields = foodItems.some(
      item => !item.name.trim() || !item.quantity || !item.mealType.trim()
    );
    if (hasMissingFields) {
      alert('Please fill out all fields for each food item.');
      return;
    }
 
    setLoading(true);
    setNotFound([]);
    setShowChart(false);
    let totals = { calories: 0, carbs: 0, protein: 0, fat: 0 };
    let itemBreakdown = [];
    let missing = [];
 
    for (let item of foodItems) {
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${item.name}&search_simple=1&json=1`
        );
        const data = await response.json();
        const product = data.products.find(p => p.nutriments && (
          p.nutriments['energy-kcal'] ||
          p.nutriments['carbohydrates'] ||
          p.nutriments['proteins'] ||
          p.nutriments['fat']
        ));
 
        if (product && product.nutriments) {
          let qty = parseFloat(item.quantity) || 1;
          if (item.unit === 'kg' || item.unit === 'l') {
            qty *= 1000;
          }
          const scale = qty / 100;
          const carbs = (product.nutriments['carbohydrates'] || 0) * scale;
          const protein = (product.nutriments['proteins'] || 0) * scale;
          const fat = (product.nutriments['fat'] || 0) * scale;
 
          totals.calories += (product.nutriments['energy-kcal'] || 0) * scale;
          totals.carbs += carbs;
          totals.protein += protein;
          totals.fat += fat;
 
          itemBreakdown.push({
            name: item.name,
            carbs: carbs.toFixed(1),
            protein: protein.toFixed(1),
            fat: fat.toFixed(1),
          });
        } else {
          missing.push(item.name);
        }
      } catch (error) {
        console.error('API Error:', error);
        missing.push(item.name);
      }
    }
 
    setNutrition(totals);
    setPerItemNutrition(itemBreakdown);
    setNotFound(missing);
    setLoading(false);
    setShowChart(true);
  };
 
  const pieData = [
    { name: 'Carbohydrates', value: nutrition.carbs },
    { name: 'Protein', value: nutrition.protein },
    { name: 'Fat', value: nutrition.fat },
  ];
 
  const renderCustomizedLabel = ({ percent, x, y }) => {
    return (
      <text x={x} y={y} fill="#000" textAnchor="middle" dominantBaseline="central" fontSize={14}>
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };
 
  return (
    <div className="nutrition-page">
      <h2 className="title">Nutrition Analyzer</h2>
      <p className="subtitle">Enter your food name to get the nutrition information</p>
 
      <div className="main-content">
        <div className="left-section">
          <div className="form-box">
            <h3 className="form-title">Nutrition calculator</h3>
            {foodItems.map((item, index) => (
              <div key={index} className="food-input-row">
                <label className="form-label">Food name</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                  className="food-name-input"
                />
                <label className="form-label">Quantity</label>
                <div className="quantity-group">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                    className="quantity-input"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => handleChange(index, 'unit', e.target.value)}
                    className="unit-select"
                  >
                    <option value="">Select unit of measure</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                  </select>
                </div>
                <label className="form-label">Meal Type</label>
                <select
                  value={item.mealType}
                  onChange={(e) => handleChange(index, 'mealType', e.target.value)}
                  className="meal-select"
                >
                  <option value="">Meal Type</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>
            ))}
            <div className="button-group-inline">
              <span onClick={addFoodItem} className="icon-button add-icon">
                <span className="icon">+</span>
                <span>Add another Food item</span>
              </span>
              <span onClick={removeFoodItem} className="icon-button remove-icon">
                <span className="icon">−</span>
                <span>Remove Food item</span>
              </span>
            </div>
            <button onClick={fetchNutrition} disabled={loading} className="calculate-btn">
              {loading ? 'Calculating...' : 'Calculate Nutrition'}
            </button>
            {notFound.length > 0 && (
              <div className="error-msg">
                ⚠️ Could not find nutrition data for: <strong>{notFound.join(', ')}</strong>
              </div>
            )}
          </div>
        </div>
 
        <div className="right-section">
          <h3 className="chart-title">Calorie Breakdown</h3>
          {showChart && (
            <>
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={renderCustomizedLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="legend">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: COLORS[index] }}></span>
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
              <div className="breakdown-table">
                <h4>Per Food Item Breakdown</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Food</th>
                      <th>Carbs (g)</th>
                      <th>Protein (g)</th>
                      <th>Fat (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perItemNutrition.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.carbs}</td>
                        <td>{item.protein}</td>
                        <td>{item.fat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
 
export default NutritionCalculator;