// src/routes/DailyPlan/DailyPlanEdit.jsx
import React, { useMemo, useState } from "react";
import "./DailyPlanEdit.css";

// ----- Types -----
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const NEW_ITEM = () => ({
  name: "",
  calories: 0,
  protein: 0,
  fat: 0,
  vitamins: 0,
  sodium: 0,
});

// ----- Helpers -----
function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromDateString(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default function DailyPlanEdit() {
  // Plan state: date + meal items
  const [dateText, setDateText] = useState(toDateString(new Date()));
  const [plan, setPlan] = useState(() => {
    const base = {};
    MEALS.forEach((m) => (base[m] = []));
    return base;
  });

  // ---- Derived totals ----
  const totals = useMemo(() => {
    const sum = { calories: 0, protein: 0, fat: 0, vitamins: 0, sodium: 0 };
    MEALS.forEach((m) => {
      (plan[m] || []).forEach((it) => {
        sum.calories += Number(it.calories) || 0;
        sum.protein += Number(it.protein) || 0;
        sum.fat += Number(it.fat) || 0;
        sum.vitamins += Number(it.vitamins) || 0;
        sum.sodium += Number(it.sodium) || 0;
      });
    });
    return sum;
  }, [plan]);

  // ---- Date controls ----
  const goPrevDay = () => {
    const d = fromDateString(dateText);
    d.setDate(d.getDate() - 1);
    setDateText(toDateString(d));
  };
  const goNextDay = () => {
    const d = fromDateString(dateText);
    d.setDate(d.getDate() + 1);
    setDateText(toDateString(d));
  };

  // ---- Item mutations ----
  const addItem = (meal) => {
    setPlan((p) => ({
      ...p,
      [meal]: [...(p[meal] || []), NEW_ITEM()],
    }));
  };

  const removeItem = (meal, index) => {
    setPlan((p) => {
      const copy = [...(p[meal] || [])];
      copy.splice(index, 1);
      return { ...p, [meal]: copy };
    });
  };

  const updateItem = (meal, index, key, value) => {
    setPlan((p) => {
      const copy = [...(p[meal] || [])];
      const next = { ...copy[index] };
      next[key] = key === "name" ? value : value === "" ? "" : Number(value);
      copy[index] = next;
      return { ...p, [meal]: copy };
    });
  };

  // ---- Actions (original logic) ----
  const savePlan = () => {
    // Hook to your API if desired
    console.log("savePlan", { date: dateText, plan });
    alert("Saved (demo): check console for payload.");
  };

  const clearAll = () => {
    if (!window.confirm("Clear all items for all meals?")) return;
    const base = {};
    MEALS.forEach((m) => (base[m] = []));
    setPlan(base);
  };

  const exportPlan = () => {
    const payload = { date: dateText, plan };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `daily-plan-${dateText}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importPlan = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || typeof data !== "object") throw new Error("Bad file");

        const nextDate = data.date || dateText;
        const nextPlan = data.plan || {};

        // Sanitize data
        const safe = {};
        MEALS.forEach((m) => {
          safe[m] = Array.isArray(nextPlan[m])
            ? nextPlan[m].map((x) => ({
                name: x?.name ?? "",
                calories: Number(x?.calories) || 0,
                protein: Number(x?.protein) || 0,
                fat: Number(x?.fat) || 0,
                vitamins: Number(x?.vitamins) || 0,
                sodium: Number(x?.sodium) || 0,
              }))
            : [];
        });

        setDateText(nextDate);
        setPlan(safe);
      } catch (e) {
        console.error(e);
        alert("Invalid plan file.");
      }
    };
    input.click();
  };

  // ---- Render (blue sidebar UI with dpe classes) ----
  return (
    <div className="dpe">
      <div className="dpe-container">
        {/* Sidebar */}
        <aside className="dpe-sidebar">
          <div className="dpe-sidebar-card">
            <div className="dpe-card-title">Date</div>

            <div className="dpe-date-nav">
              <button className="dpe-nav-btn" onClick={goPrevDay} type="button">
                ← Prev
              </button>

              <input
                className="dpe-date-input"
                type="text"
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                aria-label="Date"
              />

              <button className="dpe-nav-btn" onClick={goNextDay} type="button">
                Next →
              </button>
            </div>

            <div className="dpe-action-grid">
              <button className="dpe-btn-save" onClick={savePlan} type="button">
                Save
              </button>
              <button className="dpe-btn-clear" onClick={clearAll} type="button">
                Clear All
              </button>
              <button
                className="dpe-btn-white"
                onClick={exportPlan}
                type="button"
              >
                Export
              </button>
              <button
                className="dpe-btn-white"
                onClick={importPlan}
                type="button"
              >
                Import
              </button>
            </div>
          </div>

          <div className="dpe-sidebar-card">
            <h3 className="dpe-summary-title">Nutrition Summary</h3>
            <div className="dpe-summary-list">
              <div className="dpe-summary-item">
                <span>Calories</span> <strong>{totals.calories} kcal</strong>
              </div>
              <div className="dpe-summary-item">
                <span>Protein</span> <strong>{totals.protein} g</strong>
              </div>
              <div className="dpe-summary-item">
                <span>Fat</span> <strong>{totals.fat} g</strong>
              </div>
              <div className="dpe-summary-item">
                <span>Vitamins</span> <strong>{totals.vitamins}</strong>
              </div>
              <div className="dpe-summary-item">
                <span>Sodium</span> <strong>{totals.sodium} mg</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="dpe-main-content">
          {MEALS.map((meal) => (
            <div key={meal} className="dpe-meal-card">
              <div className="dpe-meal-header">
                <h2>{meal}</h2>
                <button
                  className="dpe-add-btn"
                  onClick={() => addItem(meal)}
                  type="button"
                >
                  + Add
                </button>
              </div>

              <div className="dpe-meal-list">
                {(plan[meal] || []).length === 0 ? (
                  <p className="dpe-empty-msg">No items yet.</p>
                ) : (
                  (plan[meal] || []).map((item, idx) => (
                    <div key={idx} className="dpe-item-row">
                      <div className="dpe-input-field name">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) =>
                            updateItem(meal, idx, "name", e.target.value)
                          }
                        />
                        <label>Name</label>
                      </div>

                      <div className="dpe-input-field num">
                        <input
                          type="number"
                          value={item.calories}
                          onChange={(e) =>
                            updateItem(meal, idx, "calories", e.target.value)
                          }
                        />
                        <label>Calories</label>
                      </div>

                      <div className="dpe-input-field num">
                        <input
                          type="number"
                          value={item.protein}
                          onChange={(e) =>
                            updateItem(meal, idx, "protein", e.target.value)
                          }
                        />
                        <label>Protein</label>
                      </div>

                      <div className="dpe-input-field num">
                        <input
                          type="number"
                          value={item.fat}
                          onChange={(e) =>
                            updateItem(meal, idx, "fat", e.target.value)
                          }
                        />
                        <label>Fat</label>
                      </div>

                      <div className="dpe-input-field num">
                        <input
                          type="number"
                          value={item.vitamins}
                          onChange={(e) =>
                            updateItem(meal, idx, "vitamins", e.target.value)
                          }
                        />
                        <label>Vitamins</label>
                      </div>

                      <div className="dpe-input-field num">
                        <input
                          type="number"
                          value={item.sodium}
                          onChange={(e) =>
                            updateItem(meal, idx, "sodium", e.target.value)
                          }
                        />
                        <label>Sodium</label>
                      </div>

                      <div className="dpe-input-field action">
                        <button
                          className="dpe-remove-text"
                          onClick={() => removeItem(meal, idx)}
                          type="button"
                        >
                          Remove
                        </button>
                        <label>Action</label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}