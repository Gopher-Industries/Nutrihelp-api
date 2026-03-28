import "./Meal.css";

import { Link } from "react-router-dom";
import React, { useState } from "react";
import MotivationalPopup from "./MotivationalPopup";
import WeeklyMealPlan from "./WeeklyMealPlan";
import { exportMealPlanAsPDF } from "./PDFExport";
import PersonalizedPlanForm from "./PersonalizedPlanForm";
import PersonalizedWeeklyPlan from "./PersonalizedWeeklyPlan";

import { useNavigate } from "react-router-dom";

const Meal = () => {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalNutrition, setTotalNutrition] = useState({
    calories: 0,
    proteins: 0,
    fats: 0,
    vitamins: 0,
    sodium: 0,
  });

  const [showBreakfast, setShowBreakfast] = useState(true);
  const [showLunch, setShowLunch] = useState(true);
  const [showDinner, setShowDinner] = useState(true);

  const [showPopup, setShowPopup] = useState(true);

  // Weekly and personalized plan toggles

  const [showPersonalized, setShowPersonalized] = useState(false);
  const [personalFilters, setPersonalFilters] = useState(null);

  const handleClosePopup = () => setShowPopup(false);

  const toggleItemSelection = (item, mealType) => {
    setSelectedItems((prevSelectedItems) => {
      const itemExists = prevSelectedItems.find(
        (selectedItem) =>
          selectedItem.name === item.name && selectedItem.mealType === mealType
      );

      if (itemExists) {
        return prevSelectedItems.filter(
          (selectedItem) =>
            !(
              selectedItem.name === item.name &&
              selectedItem.mealType === mealType
            )
        );
      } else {
        return [...prevSelectedItems, { ...item, mealType }];
      }
    });
  };

  // Items
  const breakfast = [
    {
      name: "Oatmeal",
      imageUrl:
        "https://images.immediate.co.uk/production/volatile/sites/30/2023/08/Porridge-oats-d09fae8.jpg?quality=90&resize=440,400",
      details: { calories: 150, fats: 300, proteins: 500, vitamins: 80, sodium: 300 },
    },
    {
      name: "Omelete",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo6q5-FWYZNd5DgwNQd5_1JwN30iq7KXkEVQ&usqp=CAU",
      details: { calories: 150, fats: 300, proteins: 500, vitamins: 180, sodium: 100 },
    },
    {
      name: "Berry Smoothie",
      imageUrl:
        "https://www.jessicagavin.com/wp-content/uploads/2020/07/berry-smoothie-8-1200.jpg",
      details: { calories: 200, fats: 100, proteins: 600, vitamins: 880, sodium: 30 },
    },
    {
      name: "Vegetable Stir-Fry",
      imageUrl:
        "https://www.dinneratthezoo.com/wp-content/uploads/2019/02/vegetable-stir-fry-3.jpg",
      details: { calories: 500, fats: 700, proteins: 600, vitamins: 50, sodium: 60 },
    },
    {
      name: "Greek Yogurt Parfait",
      imageUrl:
        "https://foolproofliving.com/wp-content/uploads/2017/12/Greek-Yogurt-Parfait-with-fruit-600x600.jpg",
      details: { calories: 220, fats: 70, proteins: 120, vitamins: 90, sodium: 60 },
    },
    {
      name: "Avocado Toast",
      imageUrl:
        "https://loveincrediblerecipes.com/wp-content/uploads/2024/02/avocado-toast-sourdough.jpg",
      details: { calories: 250, fats: 180, proteins: 80, vitamins: 70, sodium: 40 },
    },
  ];

  const lunch = [
    {
      name: "Chocolate Cake",
      imageUrl:
        "https://sugargeekshow.com/wp-content/uploads/2023/10/easy_chocolate_cake_slice.jpg",
      details: { calories: 350, fats: 500, proteins: 100, vitamins: 90, sodium: 5 },
    },
    {
      name: "Quinoa Salad",
      imageUrl:
        "https://cooktoria.com/wp-content/uploads/2018/08/Mediterranean-Quinoa-Salad-SQ-1.jpg",
      details: { calories: 150, fats: 300, proteins: 500, vitamins: 30, sodium: 30 },
    },
    {
      name: "Chicken Wings",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfd6SFL5sSIHlwcDV7db1dfWSpBCtyO6gujA&usqp=CAU",
      details: { calories: 20, fats: 600, proteins: 700, vitamins: 180, sodium: 30 },
    },
    {
      name: "Hotdog",
      imageUrl:
        "https://hips.hearstapps.com/hmg-prod/images/delish-202104-airfryerhotdogs-044-1619472270.jpg?crop=0.448xw:1.00xh;0.0657xw,0&resize=980:*",
      details: { calories: 500, fats: 700, proteins: 600, vitamins: 220, sodium: 20 },
    },
    {
      name: "Grilled Chicken Salad",
      imageUrl:
        "https://cdn-aboak.nitrocdn.com/QJsLnWfsWAiuukSIMowyVEHtotvSQZoR/assets/images/optimized/rev-ca18e1d/www.slenderkitchen.com/sites/default/files/styles/featured_1500/public/recipe_images/grilled-chicken-Greek-salad.jpg",
      details: { calories: 320, fats: 140, proteins: 350, vitamins: 110, sodium: 150 },
    },
    {
      name: "Pasta Primavera",
      imageUrl:
        "https://www.budgetbytes.com/wp-content/uploads/2023/05/Pasta-Primavera-V3-1152x1536.jpg",
      details: { calories: 420, fats: 160, proteins: 180, vitamins: 120, sodium: 90 },
    },
  ];

  const dinner = [
    {
      name: "Broccoli",
      imageUrl:
        "https://cdn.apartmenttherapy.info/image/upload/f_jpg,q_auto:eco,c_fill,g_auto,w_1500,ar_1:1/k%2Farchive%2Fd852987f86aeae8b65926f9e7a260c28285ea744",
      details: { calories: 250, fats: 500, proteins: 100, vitamins: 30, sodium: 90 },
    },
    {
      name: "Avocado",
      imageUrl:
        "https://domf5oio6qrcr.cloudfront.net/medialibrary/5138/h0618g16207257173805.jpg",
      details: { calories: 150, fats: 100, proteins: 500, vitamins: 80, sodium: 300 },
    },
    {
      name: "Salmon",
      imageUrl:
        "https://images.theconversation.com/files/249331/original/file-20181206-128208-1lepxpi.jpg?ixlib=rb-1.1.0&q=45&auto=format&w=1356&h=668&fit=crop",
      details: { calories: 800, fats: 700, proteins: 900, vitamins: 880, sodium: 0 },
    },
    {
      name: "Oatmeal2",
      imageUrl:
        "https://images.immediate.co.uk/production/volatile/sites/30/2023/08/Porridge-oats-d09fae8.jpg?quality=90&resize=440,400",
      details: { calories: 150, fats: 300, proteins: 500, vitamins: 680, sodium: 30 },
    },
    {
      name: "Stir-Fried Tofu Bowl",
      imageUrl:
        "https://marleyspoon.com/media/recipes/121135/main_photos/large/super_fast_tofu_buddha_s_delight_bowl-773b44bbf9caae9dbdd753a4c450065d.jpeg",
      details: { calories: 350, fats: 180, proteins: 250, vitamins: 85, sodium: 110 },
    },
    {
      name: "Baked Sweet Potatoes",
      imageUrl:
        "https://hips.hearstapps.com/hmg-prod/images/delish-perfect-baked-sweet-potato-1-1637646197.jpg?crop=1.00xw:0.710xh;0,0.187xh&resize=1200:*",
      details: { calories: 300, fats: 60, proteins: 90, vitamins: 160, sodium: 30 },
    },
  ];

  // Find details by name
  const findItemDetails = (itemName) => {
    let item = breakfast.find((i) => i.name === itemName);
    if (item) return item.details;

    item = lunch.find((i) => i.name === itemName);
    if (item) return item.details;

    item = dinner.find((i) => i.name === itemName);
    if (item) return item.details;

    return { calories: 0, proteins: 0, fats: 0, vitamins: 0, sodium: 0 };
  };

  // Recalculate totals on selection change
  React.useEffect(() => {
    let totalCalories = 0;
    let totalProteins = 0;
    let totalFats = 0;
    let totalVitamins = 0;
    let totalSodium = 0;

    selectedItems.forEach((item) => {
      const details = findItemDetails(item.name);
      totalCalories += details.calories;
      totalProteins += details.proteins;
      totalFats += details.fats;
      totalVitamins += details.vitamins;
      totalSodium += details.sodium;
    });

    setTotalNutrition({
      calories: totalCalories,
      proteins: totalProteins,
      fats: totalFats,
      vitamins: totalVitamins,
      sodium: totalSodium,
    });
  }, [selectedItems]);

  // UI helpers
  const SectionHeader = ({ title, show, toggle, totalCount, selectedCount }) => (
    <div
      className="section-header"  
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        marginTop: 12,
        padding: "8px 0",
        borderBottom: "1px solid #f3f4f6" 
      }}
      onClick={toggle}
    >
      <h3 
        className="section-header-title" 
        style={{ 
          margin: 0, 
          marginLeft: 0,      
          width: "120px",     
          flexShrink: 0,        
          color: "#333333",     
          position: "relative", 
          zIndex: 1,
          display: "block"      
        }}
      >
        {title}
      </h3>

      <div className="section-header-info" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="info-badge" style={{
          fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999,
          background: "#eef2ff", color: "#3730a3", whiteSpace: "nowrap"
        }}>
          {totalCount} items
        </span>
        <span className="info-badge" style={{
          fontSize: "0.75rem", padding: "4px 10px", borderRadius: 999,
          background: selectedCount > 0 ? "#E8F1FF" : "#f3f4f6",
          color: selectedCount > 0 ? "#005BBB" : "#374151",
          whiteSpace: "nowrap"
        }}>
          {selectedCount} selected
        </span>
        
        <span className="info-hint" style={{ 
          fontSize: "0.75rem", 
          color: "#6b7280", 
          fontStyle: "italic",
          minWidth: "100px",
          textAlign: "right"
        }}>
          {show ? "Tap to collapse" : "Tap to expand"}
        </span>
      </div>
    </div>
  );

  const isSelected = (name) => selectedItems.some((s) => s.name === name);

  const SelectedBadge = () => (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(232, 241, 255, 0.95)",
        color: "black",
        fontSize: "0.75rem",
        padding: "2px 6px",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      Selected
    </div>
  );

  const NutritionBar = ({ label, value, max = 1000, unit = "" }) => {
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    return (
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
            fontSize: "0.875rem",
          }}
        >
          <span>{label}</span>
          <span>
            {value}
            {unit}
          </span>
        </div>
        <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999 }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "#60a5fa",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "1200px", padding: "16px" }}>
        {showPopup && <MotivationalPopup onClose={handleClosePopup} />}

        {/* Header */}
        <header
          style={{
            width: "100%",
            background: "transparent",
            borderRadius: "16px",
            padding: "20px",
            margin: "8px 0 16px 0",
          }}
        >
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(1.375rem, 4vw, 2.25rem)", lineHeight: 1.2 }}>
              What is Your Meal Plan Today?
            </h1>
          </div>
        </header>

        {/* Personalized Weekly Plan at top */}
        <div
          style={{
            width: "100%",
            background: "transparent",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <button
              className="toggle-weekly-btn"
              onClick={() => setShowPersonalized(!showPersonalized)}
              style={{
                width: "100%",
                maxWidth: "520px",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              {showPersonalized ? "Hide Personalized Weekly Plan" : "Show Personalized Weekly Plan"}
            </button>

            {showPersonalized && (
              <div style={{ width: "100%", marginTop: "16px" }}>
                <div
                  className="weekly-container"
                  style={{
                    width: "100%",
                    background: "var(--background-secondary)",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <h2 style={{ 
                    textAlign: "center", 
                    marginTop: 0, 
                    fontSize: "clamp(1.125rem, 4vw, 1.75rem)", 
                    lineHeight: 1.3,
                    color: "var(--text-primary)"
                  }}>
                    🎯 Personalized Weekly Plan
                  </h2>
                  <PersonalizedPlanForm onGenerate={(filters) => setPersonalFilters(filters)} />
                  {personalFilters && (
                    <div style={{ width: "100%", marginTop: "12px" }}>
                      <PersonalizedWeeklyPlan
                        filters={personalFilters}
                        onExport={() => exportMealPlanAsPDF('personalized-meal-plan')}
                        showExport
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content with meals on left and nutritional panel on right */}
        <div 
          className="meal-container" 
          style={{ 
            display: "flex",
            gap: "24px",
            alignItems: "flex-start"
          }}
        >
          {/* LEFT: Meal sections */}
          <div style={{ 
            flex: "1",
            minWidth: "0"
          }}>
            {/* Breakfast */}
            <SectionHeader
              title="Breakfast"
              show={showBreakfast}
              toggle={() => setShowBreakfast(!showBreakfast)}
              totalCount={breakfast.length}
              selectedCount={selectedItems.filter((s) => s.mealType === "breakfast").length}
            />
            <div
              className="menuContainer"
              style={{
                maxHeight: showBreakfast ? "9999px" : "0",
                overflow: "hidden",
                transition: "max-height 0.5s ease",
              }}
            >
              {showBreakfast &&
                breakfast.map((item) => (
                  <div
                    className={`food-item ${isSelected(item.name) ? "selected" : ""}`}
                    key={item.name}
                    onClick={() => toggleItemSelection(item, "breakfast")}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      borderRadius: 12,
                      overflow: "hidden",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                    }}
                  >
                    {isSelected(item.name) && <SelectedBadge />}
                    <img src={item.imageUrl} alt={item.name} />
                    <div className="names" style={{ paddingBottom: 6 }}>
                      <b>{item.name}</b>
                    </div>
                  </div>
                ))}
            </div>

            {/* Lunch */}
            <SectionHeader
              title="Lunch"
              show={showLunch}
              toggle={() => setShowLunch(!showLunch)}
              totalCount={lunch.length}
              selectedCount={selectedItems.filter((s) => s.mealType === "lunch").length}
            />
            <div
              className="menuContainer"
              style={{
                maxHeight: showLunch ? "9999px" : "0",
                overflow: "hidden",
                transition: "max-height 0.5s ease",
              }}
            >
              {showLunch &&
                lunch.map((item) => (
                  <div
                    className={`food-item ${isSelected(item.name) ? "selected" : ""}`}
                    key={item.name}
                    onClick={() => toggleItemSelection(item, "lunch")}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      borderRadius: 12,
                      overflow: "hidden",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                    }}
                  >
                    {isSelected(item.name) && <SelectedBadge />}
                    <img src={item.imageUrl} alt={item.name} />
                    <div className="names" style={{ paddingBottom: 6 }}>
                      <b>{item.name}</b>
                    </div>
                  </div>
                ))}
            </div>

            {/* Dinner */}
            <SectionHeader
              title="Dinner"
              show={showDinner}
              toggle={() => setShowDinner(!showDinner)}
              totalCount={dinner.length}
              selectedCount={selectedItems.filter((s) => s.mealType === "dinner").length}
            />
            <div
              className="menuContainer"
              style={{
                maxHeight: showDinner ? "9999px" : "0",
                overflow: "hidden",
                transition: "max-height 0.5s ease",
              }}
            >
              {showDinner &&
                dinner.map((item) => (
                  <div
                    className={`food-item ${isSelected(item.name) ? "selected" : ""}`}
                    key={item.name}
                    onClick={() => toggleItemSelection(item, "dinner")}
                    style={{
                      cursor: "pointer",
                      position: "relative",
                      borderRadius: 12,
                      overflow: "hidden",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                    }}
                  >
                    {isSelected(item.name) && <SelectedBadge />}
                    <img src={item.imageUrl} alt={item.name} />
                    <div className="names" style={{ paddingBottom: 6 }}>
                      <b>{item.name}</b>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* RIGHT: Nutritional Value Panel - Sticky positioned */}
          <div 
            className="details-container" 
            style={{ 
              position: "sticky",
              top: "16px",
              width: "350px",
              flexShrink: 0,
              alignSelf: "flex-start"
            }}
          >
            <div className="details-box" style={{ borderRadius: 16 }}>
              <h3 style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)", margin: "0 auto", marginBottom: "0.5rem", textAlign: "center" }}>Nutritional Value</h3>
              <ul
                style={{
                  fontSize: "clamp(1rem, 2vw, 1.2rem)",
                  marginTop: "0.5rem",
                  listStyle: "none",
                  paddingLeft: 0,
                  marginBottom: 12,
                }}
              >
                <li>Total items selected: {selectedItems.length}</li>
              </ul>

              <div style={{ marginTop: 8 }}>
                <NutritionBar label="Calories" value={totalNutrition.calories} max={2500} unit="" />
                <NutritionBar label="Proteins" value={totalNutrition.proteins} max={250} unit="g" />
                <NutritionBar label="Fats" value={totalNutrition.fats} max={250} unit="g" />
                <NutritionBar label="Vitamins" value={totalNutrition.vitamins} max={1000} unit="mg" />
                <NutritionBar label="Sodium" value={totalNutrition.sodium} max={2300} unit="mg" />
              </div>

              <ul style={{ fontSize: "clamp(1rem, 2vw, 1.3rem)", marginTop: "12px" }}>
                <li>Calories: {totalNutrition.calories}</li>
                <li>Proteins: {totalNutrition.proteins}g</li>
                <li>Fats: {totalNutrition.fats}g</li>
                <li>Vitamins: {totalNutrition.vitamins}mg</li>
                <li>Sodium: {totalNutrition.sodium}mg</li>
              </ul>
            </div>

            <Link className="link" to="/nutrition-calculator">
              <button className="viewplan">
                Go to Nutrition Calculator
              </button>
            </Link>

            <Link className="link" to="/dashboard" state={{ selectedItems, totalNutrition }}>
              <button className="viewplan">
                View Meal Plan
              </button>
            </Link>

            {/* Weekly plan */}
            <div className="link" onClick={() => navigate("/weekly-plan")} style={{ cursor: 'pointer' }}>
              <button className="viewplan">
                View Full Weekly Meal Plan
              </button>
            </div>

            <Link className="link" to="/shopping-list" state={{ selectedItems, totalNutrition }}>
              <button className="viewplan">
                🛒 Shopping List
              </button>
            </Link>

          </div>
        </div>
      </div>     
    </div>
  );
};

export default Meal;