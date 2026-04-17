import React, { useState } from "react";
import "./FoodPreferences.css";
 
const allergies = [
  {
    id: "milk",
    label: "Milk allergy?",
    desc: "Stay safe by avoiding all dairy like milk, cheese, and yogurt - even small amounts can cause reactions.",
    icon: "milk.png",
  },
  {
    id: "egg",
    label: "Egg allergy?",
    desc: "Watch out for both egg whites and yolks - they can sneak into baked goods, sauces, and even some pastas.",
    icon: "egg.jpeg",
  },
  {
    id: "tree",
    label: "Tree nut allergy?",
    desc: "Steer clear of almonds, cashews, walnuts, and anything made with nut oils - even small traces can cause serious reactions.",
    icon: "treenut.jpg",
  },
  {
    id: "shellfish",
    label: "Shellfish allergy?",
    desc: "Avoid shrimp, crab, lobster, and similar seafood - reactions can be severe, even from tiny traces.",
    icon: "shellfish.png",
  },
  {
    id: "wheat",
    label: "Wheat allergy?",
    desc: "That means avoiding bread, pasta, cereal, and many processed foods. Wheat can show up in unexpected places!",
    icon: "wheat.jpeg",
  },
  {
    id: "soy",
    label: "Soy allergy?",
    desc: "Avoid soybeans and products like tofu, soy sauce, and many meat substitutes - soy is common in processed foods.",
    icon: "soy.jpeg",
  },
  {
    id: "sesame",
    label: "Sesame allergy?",
    desc: "Stay away from sesame seeds, oil, tahini, and breads topped with seeds - even small amounts can cause a reaction.",
    icon: "sesame.jpg",
  },
];
 
const intolerances = [
  {
    id: "lactose",
    label: "Lactose intolerance?",
    desc: "Your body has trouble digesting dairy - milk, cheese, and ice cream might lead to bloating or discomfort.",
    icon: "lactose_intolerant.jpg",
  },
  {
    id: "fructose",
    label: "Fructose intolerance?",
    desc: "Fruits, honey, and sugary drinks can cause bloating, gas, or discomfort - it's best to limit high-fructose foods.",
    icon: "fructose_intolerance.png",
  },
  {
    id: "histamine",
    label: "Histamine intolerance?",
    desc: "Aged cheese, wine, and fermented foods might trigger headaches, rashes, or nasal congestion - it's all about balance.",
    icon: "histamine_intolerance.png",
  },
  {
    id: "fodmap",
    label: "FODMAP intolerance?",
    desc: "Certain carbs in foods like garlic, onions, beans, and apples can cause bloating, gas, and stomach pain.",
    icon: "FODMAP.png",
  },
  {
    id: "gluten",
    label: "Gluten intolerance?",
    desc: "Grains like wheat, barley, and rye can lead to stomach pain, fatigue, or brain fog - gluten-free options are the way to go.",
    icon: "gluten_intolerance.png",
  },
  {
    id: "caffeine",
    label: "Caffeine sensitivity?",
    desc: "Even a small amount of coffee, tea, or energy drinks can cause jitters, anxiety, or trouble sleeping.",
    icon: "caffeine_sensitivity.png",
  },
  {
    id: "msg",
    label: "MSG sensitivity?",
    desc: "Flavored snacks, instant noodles, and takeout may cause headaches, flushing, or discomfort - best to limit foods with added MSG.",
    icon: "MSG_sensitivity.png",
  },
];
 
export default function FoodPreferences() {
  const [selected, setSelected] = useState(["milk", "fructose", "egg"]);
 
  const toggleItem = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
 
  const [showAddBox, setShowAddBox] = useState(false);
  const [newItem, setNewItem] = useState("");
 
  const handleAdd = () => {
    const cleaned = newItem.trim();
    if (cleaned && !selected.includes(cleaned)) {
      setSelected([...selected, cleaned]);
    }
    setNewItem("");
    setShowAddBox(false);
  };
 
  const [showBanner, setShowBanner] = useState(false);
 
  const [showWarnings, setShowWarnings] = useState(true);
  const [hideMeals, setHideMeals] = useState(true);
 
  return (
    <div className="page-wrapper">
      <div className="purple-box">
        <div className="section-heading">
          <h1>Food Allergies & Intolerances</h1>
          <p className="subtitle">
            <strong>Know what to avoid. Stay Safe, eat smart.</strong>
          </p>
          <p>
            Let us know what foods you avoid so we can tailor your experience
            and keep your meals safe.
          </p>
          <span className="start-btn">START SELECTING</span>
        </div>
 
        <div className="grid">
          <div className="column white-card">
            <h3>Common Allergies</h3>
            {allergies.map((item) => (
              <div key={item.id} className="item-card">
                <img
                  src={`/images/allergy-icons/${item.icon}`}
                  alt={item.label}
                  className="item-icon"
                />
                <div className="details">
                  <strong>{item.label}</strong>
                  <p>{item.desc}</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            ))}
          </div>
 
          <div className="column white-card">
            <h3>Common Intolerances</h3>
            {intolerances.map((item) => (
              <div key={item.id} className="item-card">
                <img
                  src={`/images/allergy-icons/${item.icon}`}
                  alt={item.label}
                  className="item-icon"
                />
                <div className="details">
                  <strong>{item.label}</strong>
                  <p>{item.desc}</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
 
        <div className="selection-summary">
          <h4>
            <strong>Your selected allergies and intolerances</strong>
          </h4>
          <div className="tags">
            {selected.map((id) => (
              <span className="tag" key={id}>
                {id.charAt(0).toUpperCase() + id.slice(1).replace("_", " ")}
              </span>
            ))}
          </div>
          <button
            className="add-btn"
            onClick={() => setShowAddBox(!showAddBox)}
          >
            <span className="plus-icon">+</span> Add allergy or intolerance
          </button>
          {showAddBox && (
            <div className="add-box">
              <label htmlFor="custom-intolerance" className="box-label">
                <strong>Add a intolerance or allergy:</strong>
              </label>
              <input
                id="custom-intolerance"
                type="text"
                placeholder="e.g. Coconut Allergy"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="add-box-input"
              />
              <button className="add-box-submit" onClick={handleAdd}>
                Add
              </button>
            </div>
          )}
        </div>
 
        <div className="preference-options">
          <h4>Preferences</h4>
          <label className="checkbox-row">
            <input type="checkbox" />
            Show warnings on recipes with my allergens
          </label>
          <label className="checkbox-row">
            <input type="checkbox" />
            Hide meals can contain my selected allergens
          </label>
        </div>
 
        <div className="save-btn-wrapper">
          <button
            className="save-btn"
            onClick={() => {
              setShowBanner(true);
            }}
          >
            SAVE PREFERENCES
          </button>
          {showBanner && (
            <div className="styled-alert">
              <p className="alert-message">
                <strong>NutriHelp says</strong>
                <br />
                Preferences saved successfully!
              </p>
              <button className="alert-ok" onClick={() => setShowBanner(false)}>
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 
 