import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import DashboardGraph from "../../components/Dashboard-Graph";
import Card from "./MenuCard";
import "./MenuCard.css";
import "./Menustyles.css";
import imageMapping from "./importImages.js";
import WaterTracker from "../../components/WaterTracker";

const Dashboard = () => {
  const location = useLocation();
  const selectedItems = location.state?.selectedItems || [];
  const totalNutrition = location.state?.totalNutrition || {
    calories: 0,
    proteins: 0,
    fats: 0,
    vitamins: 0,
    sodium: 0,
  };

  const [activeTab, setActiveTab] = useState("breakfast");
  const [groupedItems, setGroupedItems] = useState({
    breakfast: [],
    lunch: [],
    dinner: [],
  });

  useEffect(() => {
    setGroupedItems({
      breakfast: selectedItems.filter((i) => i.mealType === "breakfast"),
      lunch: selectedItems.filter((i) => i.mealType === "lunch"),
      dinner: selectedItems.filter((i) => i.mealType === "dinner"),
    });
  }, [selectedItems]);

  const renderMealItems = (mealType) => {
    const items = groupedItems[mealType];
    if (!items || items.length === 0) return <div className="no-items">No items available</div>;

    return (
      <div className="cards-container">
        {items.map((item, idx) => (
          <Card key={idx} item={item} imageMapping={imageMapping} />
        ))}
      </div>
    );
  };

  return (
    <main>
      <div className="mainBox">
        <div className="Title">
          <h2>MENU</h2>
        </div>

        <Link to="/appointment" className="button-link">
          <button className="appointment-btn">Book an Appointment</button>
        </Link>

        <div style={{ height: 16 }} />

        {/* Row 1: Today aligned to the middle (Lunch) column, width matches the meal pane only */}
        <div className="today-row">
          <div className="today-align-grid">
            <div />
            <div className="today-text">Today</div>
            <div />
          </div>
          <div className="today-row-spacer" />
        </div>

        {/* Row 2: Meals (tabs+cards) + Water (same height as tabs+cards, NOT including Today) */}
        <div className="meal-water-row">
          <div className="meal-pane">
            <nav className="meal-nav-tabs" role="tablist" aria-label="Meal tabs">
              <button
                type="button"
                className={`nav-tab-btn ${activeTab === "breakfast" ? "active" : ""}`}
                onClick={() => setActiveTab("breakfast")}
                aria-selected={activeTab === "breakfast"}
              >
                Breakfast
              </button>

              <button
                type="button"
                className={`nav-tab-btn ${activeTab === "lunch" ? "active" : ""}`}
                onClick={() => setActiveTab("lunch")}
                aria-selected={activeTab === "lunch"}
              >
                Lunch
              </button>

              <button
                type="button"
                className={`nav-tab-btn ${activeTab === "dinner" ? "active" : ""}`}
                onClick={() => setActiveTab("dinner")}
                aria-selected={activeTab === "dinner"}
              >
                Dinner
              </button>
            </nav>

            <div className="meal-scroll-wrapper">{renderMealItems(activeTab)}</div>
          </div>

          {/* Water card: no extra wrapper card, and stretched to match meal-pane height */}
          <div className="water-panel">
            <div className="water-fill">
              <WaterTracker />
            </div>
          </div>
        </div>

        {/* Graph area: keep content, but NO shadow card outer frame */}
        <div className="dashboard-graph-section">
          <div className="nutrition-summary">
            <DashboardGraph
              totalNutritionCalorie={totalNutrition.calories}
              totalNutritionProtiens={totalNutrition.proteins}
              totalNutritionFats={totalNutrition.fats}
              totalNutritionVitamins={totalNutrition.vitamins}
              totalNutritionSodium={totalNutrition.sodium}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
